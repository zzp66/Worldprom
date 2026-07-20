class VariantSelectsHV extends HTMLElement {
  constructor() {
    super();
    this.productUrl = this.dataset.productUrl || this.dataset.url;
    this.sectionId = this.dataset.section;
    this.productWrapper = this.closest('.thb-product-detail');
    if (this.productWrapper) {
      this.productSlider = this.productWrapper.querySelector('.product-images');
      this.thumbnails = this.productWrapper.querySelector('.product-thumbnail-container');
    }
    this._fetchController = null;
  }

  connectedCallback() {
    this.addEventListener('change', this.onVariantChange.bind(this));
    this.currentVariant = this.getSelectedVariant();
    this._lastColorValue = this.getSelectedColorValue();
    this.filterGalleryByColor(this._lastColorValue);
  }

  getSelectedVariant() {
    const el = this.querySelector('[data-selected-variant]');
    if (el) {
      try { return JSON.parse(el.textContent); } catch (e) { return null; }
    }
    return null;
  }

  isColorFieldset(fieldset) {
    if (!fieldset) return false;
    const handle = (fieldset.dataset.handle || '').toLowerCase();
    const optionName = (fieldset.dataset.optionName || '').toLowerCase();
    return handle.includes('color') || handle.includes('colour') || optionName === 'color';
  }

  getSelectedColorValue() {
    const fieldsets = this.querySelectorAll('fieldset');
    for (const fieldset of fieldsets) {
      if (!this.isColorFieldset(fieldset)) continue;
      const checked = fieldset.querySelector('input[type="radio"]:checked');
      if (checked) return checked.value;
      const select = fieldset.querySelector('select');
      if (select) return select.value;
    }
    return null;
  }

  getColorNeedles() {
    const needles = [];
    this.querySelectorAll('fieldset').forEach((fieldset) => {
      if (!this.isColorFieldset(fieldset)) return;
      fieldset.querySelectorAll('input[type="radio"]').forEach((input) => {
        const label = (input.dataset.colorLabel || input.value || '').trim().toLowerCase();
        if (label) needles.push(label);
      });
      fieldset.querySelectorAll('select option').forEach((option) => {
        const label = (option.dataset.colorLabel || option.value || '').trim().toLowerCase();
        if (label) needles.push(label);
      });
    });
    return needles;
  }

  mediaMatchesColor(el, colorNeedle, allNeedles) {
    if (!el || !colorNeedle) return true;
    const img = el.querySelector('img');
    const haystack = [
      img?.currentSrc || '',
      img?.src || '',
      img?.getAttribute('srcset') || '',
      img?.alt || '',
      el.getAttribute('data-media-id') || '',
      el.innerHTML || ''
    ].join('|').toLowerCase();

    if (!haystack.includes(colorNeedle)) return false;

    const activeLen = colorNeedle.length;
    for (const other of allNeedles) {
      if (!other || other === colorNeedle) continue;
      if (other.length > activeLen && haystack.includes(other)) return false;
    }
    return true;
  }

  filterGalleryByColor(colorValue) {
    if (!this.productWrapper || !colorValue) return;
    const colorNeedle = String(colorValue).trim().toLowerCase();
    if (!colorNeedle) return;

    const allNeedles = this.getColorNeedles();
    const roots = [
      this.productWrapper.querySelector('[id^="hv-media-gallery-"]'),
      this.productWrapper.querySelector('.product-thumbnail-container')
    ].filter(Boolean);

    roots.forEach((root) => {
      const slides = root.querySelectorAll(
        '.product-images__slide, .product-thumbnail, [data-media-id]'
      );
      let firstVisible = null;
      slides.forEach((slide) => {
        const match = this.mediaMatchesColor(slide, colorNeedle, allNeedles);
        slide.hidden = !match;
        slide.style.display = match ? '' : 'none';
        if (match && !firstVisible) firstVisible = slide;
      });
      if (firstVisible) {
        root.querySelectorAll('.is-active').forEach((el) => el.classList.remove('is-active'));
        firstVisible.classList.add('is-active');
      }
    });

    this.reinitSlider();
  }

  onVariantChange(event) {
    const input = event.target;
    if (!input.matches('input[type="radio"], select')) return;

    const changedFieldset = input.closest('fieldset');
    const colorChanged = this.isColorFieldset(changedFieldset);
    const selectedOptionValueIds = this.getSelectedOptionValueIds();
    const productUrl = input.dataset.productUrl;
    const baseUrl = productUrl || this.productUrl;

    const params = new URLSearchParams();
    params.set('section_id', this.sectionId);
    if (selectedOptionValueIds.length > 0) {
      params.set('option_values', selectedOptionValueIds.join(','));
    }

    this.toggleAddButton(true);

    if (this._fetchController) {
      this._fetchController.abort();
    }
    this._fetchController = new AbortController();

    fetch(`${baseUrl}?${params.toString()}`, { signal: this._fetchController.signal })
      .then(res => res.text())
      .then(html => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        this.updateFromResponse(doc, input.id, colorChanged);
        this._lastColorValue = this.getSelectedColorValue();
        if (colorChanged) {
          this.filterGalleryByColor(this._lastColorValue);
        }
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        console.error('HV variant change error:', err);
        this.toggleAddButton(false);
      });
  }

  getSelectedOptionValueIds() {
    const ids = [];
    this.querySelectorAll('fieldset').forEach(fieldset => {
      const checked = fieldset.querySelector('input[type="radio"]:checked');
      if (checked && checked.dataset.optionValueId) {
        ids.push(checked.dataset.optionValueId);
      } else {
        const select = fieldset.querySelector('select');
        if (select) {
          const selectedOption = select.options[select.selectedIndex];
          if (selectedOption && selectedOption.dataset.optionValueId) {
            ids.push(selectedOption.dataset.optionValueId);
          }
        }
      }
    });
    return ids;
  }

  updateFromResponse(doc, focusId, replaceGallery) {
    if (replaceGallery) {
      const newGallery = doc.querySelector('[id^="hv-media-gallery-"]');
      const oldGallery = this.productWrapper?.querySelector('[id^="hv-media-gallery-"]');
      if (newGallery && oldGallery) {
        oldGallery.innerHTML = newGallery.innerHTML;
        oldGallery.setAttribute('data-hv-filter', newGallery.getAttribute('data-hv-filter') || '1');
      }
      const newThumbs = doc.querySelector('.product-thumbnail-container');
      const oldThumbs = this.productWrapper?.querySelector('.product-thumbnail-container');
      if (newThumbs && oldThumbs) {
        oldThumbs.innerHTML = newThumbs.innerHTML;
      }
    }

    const newPicker = doc.querySelector('variant-selects-hv');
    if (newPicker) {
      const newVariations = newPicker.querySelector('.variations');
      const oldVariations = this.querySelector('.variations');
      if (newVariations && oldVariations) {
        oldVariations.innerHTML = newVariations.innerHTML;
      }

      const newVariantJson = newPicker.querySelector('[data-selected-variant]');
      const oldVariantJson = this.querySelector('[data-selected-variant]');
      if (newVariantJson && oldVariantJson) {
        oldVariantJson.textContent = newVariantJson.textContent;
      }
      this.currentVariant = this.getSelectedVariant();
    }

    const newPrice = doc.querySelector(`#price-${this.sectionId}`);
    const oldPrice = this.productWrapper?.querySelector(`#price-${this.sectionId}`);
    if (newPrice && oldPrice) {
      oldPrice.innerHTML = newPrice.innerHTML;
    }

    this.updateAddButton();
    this.updateVariantInput();
    this.updateURL();

    const newSku = doc.querySelector(`#sku-${this.sectionId}`);
    const oldSku = this.productWrapper?.querySelector(`#sku-${this.sectionId}`);
    if (newSku && oldSku) {
      oldSku.innerHTML = newSku.innerHTML;
    }

    if (focusId) {
      const el = document.getElementById(focusId);
      if (el) el.focus();
    }

    this.dispatchEvent(new CustomEvent('variant:change', {
      bubbles: true,
      detail: { variant: this.currentVariant }
    }));

    if (typeof dispatchCustomEvent === 'function') {
      dispatchCustomEvent('product:variant-change', {
        variant: this.currentVariant,
        sectionId: this.sectionId
      });
    }
  }

  updateAddButton() {
    if (!this.currentVariant) {
      this.toggleAddButton(true, '', true);
      return;
    }
    this.toggleAddButton(!this.currentVariant.available, '', !this.currentVariant.available);
  }

  toggleAddButton(disable, text, modifyClass) {
    const productForm = document.getElementById(`product-form-${this.sectionId}`);
    if (!productForm) return;
    const addButton = productForm.querySelector('[name="add"]');
    if (!addButton) return;
    const addButtonText = addButton.querySelector('.single-add-to-cart-button--text');

    if (disable) {
      addButton.setAttribute('disabled', 'disabled');
    } else {
      addButton.removeAttribute('disabled');
    }

    if (modifyClass) {
      addButton.classList.add('sold-out');
      if (addButtonText) {
        addButtonText.textContent = window.theme?.variantStrings?.soldOut || 'Sold out';
      }
    } else {
      addButton.classList.remove('sold-out');
      if (addButtonText && !disable) {
        addButtonText.textContent = window.theme?.variantStrings?.addToCart || 'Add to cart';
      }
    }
  }

  updateVariantInput() {
    if (!this.currentVariant) return;
    const forms = document.querySelectorAll(`#product-form-${this.sectionId}, #product-form-installment`);
    forms.forEach(form => {
      const input = form.querySelector('input[name="id"]');
      if (input) {
        input.value = this.currentVariant.id;
        input.removeAttribute('disabled');
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  }

  updateURL() {
    if (!this.currentVariant) return;
    const selectedIds = this.getSelectedOptionValueIds();
    if (selectedIds.length > 0) {
      window.history.replaceState({}, '', `${this.productUrl}?option_values=${selectedIds.join(',')}`);
    }
  }

  reinitSlider() {
    const sliderEl = this.productWrapper?.querySelector('product-slider, product-slider-thumbnails');
    if (sliderEl && typeof sliderEl.connectedCallback === 'function') {
      sliderEl.connectedCallback();
    }
  }
}

if (!customElements.get('variant-selects-hv')) {
  customElements.define('variant-selects-hv', VariantSelectsHV);
}
