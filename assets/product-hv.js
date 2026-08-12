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
    if (!this.isSharedDetailMode()) {
      this.filterGalleryByColor(this._lastColorValue);
    }
  }

  getGalleryRoot() {
    return this.productWrapper?.querySelector('[id^="hv-media-gallery-"]');
  }

  isSharedDetailMode() {
    const gallery = this.getGalleryRoot();
    return (gallery?.dataset.hvGalleryMode || 'per_color') === 'shared_detail';
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

  normalizeColorToken(value) {
    return String(value || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

  getColorNeedles() {
    const needles = [];
    this.querySelectorAll('fieldset').forEach((fieldset) => {
      if (!this.isColorFieldset(fieldset)) return;
      fieldset.querySelectorAll('input[type="radio"]').forEach((input) => {
        const label = this.normalizeColorToken(input.dataset.colorLabel || input.value);
        if (label) needles.push(label);
      });
      fieldset.querySelectorAll('select option').forEach((option) => {
        const label = this.normalizeColorToken(option.dataset.colorLabel || option.value);
        if (label) needles.push(label);
      });
    });
    return needles;
  }

  mediaMatchesColor(el, colorNeedle, allNeedles) {
    if (!el || !colorNeedle) return true;
    const assignedColor = this.normalizeColorToken(el.dataset.hvColor);
    if (assignedColor) return assignedColor === colorNeedle;

    const img = el.querySelector('img');
    const haystack = this.normalizeColorToken([
      img?.currentSrc || '',
      img?.src || '',
      img?.getAttribute('srcset') || '',
      img?.alt || '',
      el.getAttribute('data-media-id') || '',
      el.innerHTML || ''
    ].join('|'));

    if (!haystack.includes(colorNeedle)) return false;

    const activeLen = colorNeedle.length;
    for (const other of allNeedles) {
      if (!other || other === colorNeedle) continue;
      if (other.length > activeLen && haystack.includes(other)) return false;
    }
    return true;
  }

  filterGalleryByColor(colorValue) {
    if (this.isSharedDetailMode()) return;
    if (!this.productWrapper || !colorValue) return;
    const colorNeedle = this.normalizeColorToken(colorValue);
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
        if (slide.dataset.hvRole === 'shared') {
          slide.hidden = false;
          slide.style.display = '';
          return;
        }
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

  swapHeroFromResponse(doc) {
    if (!this.productWrapper || !doc) return false;

    const newHeroSlide = doc.querySelector('.product-images__slide[data-hv-role="hero"]');
    const oldHeroSlide = this.productWrapper.querySelector('.product-images__slide[data-hv-role="hero"]');
    if (newHeroSlide && oldHeroSlide) {
      const wasActive = oldHeroSlide.classList.contains('is-active');
      const replacement = newHeroSlide.cloneNode(true);
      if (wasActive) replacement.classList.add('is-active');
      oldHeroSlide.replaceWith(replacement);
    } else if (newHeroSlide && !oldHeroSlide) {
      const slider = this.productWrapper.querySelector('.product-images');
      if (slider) {
        const sharedSlide = slider.querySelector('.product-images__slide[data-hv-role="shared"]');
        const clone = newHeroSlide.cloneNode(true);
        clone.classList.add('is-active');
        if (sharedSlide) slider.insertBefore(clone, sharedSlide);
        else slider.prepend(clone);
      }
    }

    const newHeroThumb = doc.querySelector('.product-thumbnail[data-hv-role="hero"]');
    const oldHeroThumb = this.productWrapper.querySelector('.product-thumbnail[data-hv-role="hero"]');
    if (newHeroThumb && oldHeroThumb) {
      const wasSelected = oldHeroThumb.classList.contains('is-active') || oldHeroThumb.classList.contains('is-initial-selected');
      const replacement = newHeroThumb.cloneNode(true);
      if (wasSelected) {
        replacement.classList.add('is-active');
        replacement.classList.add('is-initial-selected');
      }
      oldHeroThumb.replaceWith(replacement);
    } else if (newHeroThumb && !oldHeroThumb) {
      const thumbs = this.productWrapper.querySelector('.product-thumbnail-container');
      if (thumbs) {
        const sharedThumb = thumbs.querySelector('.product-thumbnail[data-hv-role="shared"]');
        const clone = newHeroThumb.cloneNode(true);
        clone.classList.add('is-active');
        clone.classList.add('is-initial-selected');
        if (sharedThumb) thumbs.insertBefore(clone, sharedThumb);
        else thumbs.prepend(clone);
      }
    }

    this.reinitSlider();
    return true;
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
        if (colorChanged && !this.isSharedDetailMode()) {
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

  getColorOrder() {
    const colorFieldset = Array.from(this.querySelectorAll('fieldset')).find((fieldset) =>
      this.isColorFieldset(fieldset)
    );
    if (!colorFieldset) return [];

    return Array.from(colorFieldset.querySelectorAll('input[type="radio"], select option'))
      .map((option) => option.value)
      .filter(Boolean);
  }

  restoreColorOrder(colorOrder) {
    if (!colorOrder.length) return;

    const colorFieldset = Array.from(this.querySelectorAll('fieldset')).find((fieldset) =>
      this.isColorFieldset(fieldset)
    );
    const wrapper = colorFieldset?.querySelector('.product-form__input-wrapper');
    if (!wrapper) return;

    const nodes = new Map();
    wrapper.querySelectorAll('input[type="radio"]').forEach((input) => {
      const box = input.closest('.option-value-box');
      if (box) {
        nodes.set(input.value, [box]);
        return;
      }
      const label = input.id
        ? wrapper.querySelector(`label[for="${CSS.escape(input.id)}"]`)
        : null;
      nodes.set(input.value, label ? [input, label] : [input]);
    });

    colorOrder.forEach((value) => {
      const group = nodes.get(value);
      if (!group) return;
      group.forEach((node) => wrapper.appendChild(node));
    });

    wrapper.querySelectorAll('.option-value-box--color').forEach((box) => {
      if (!box.querySelector('input, label')) box.remove();
    });
  }

  preserveSizeTable(oldVariations) {
    if (!oldVariations) return null;
    const sizeTable = oldVariations.querySelector('.variant-size-table-wrapper');
    if (!sizeTable) return null;
    // Detach before innerHTML replace so initialized listeners stay intact
    sizeTable.remove();
    return sizeTable;
  }

  restoreSizeTable(oldVariations, sizeTable) {
    if (!oldVariations || !sizeTable) return;

    // Section HTML 里的尺码表脚本不会执行，去掉未初始化副本
    oldVariations.querySelectorAll('.variant-size-table-wrapper').forEach((el) => {
      const next = el.nextElementSibling;
      el.remove();
      if (
        next &&
        next.tagName === 'SCRIPT' &&
        (next.textContent || '').includes('sizeChartProfiles')
      ) {
        next.remove();
      }
    });

    const sizeHost =
      oldVariations.querySelector('[data-handle="size"]')?.closest('.option-chose-box') ||
      oldVariations.querySelector('.product-form__input-wrapper-size')?.closest('.option-chose-box') ||
      oldVariations;
    sizeHost.appendChild(sizeTable);
  }

  updateFromResponse(doc, focusId, replaceGallery) {
    const colorOrder = this.getColorOrder();
    const oldVariations = this.querySelector('.variations');
    const sizeTable = this.preserveSizeTable(oldVariations);
    const sharedDetail = this.isSharedDetailMode();

    if (replaceGallery) {
      if (sharedDetail) {
        this.swapHeroFromResponse(doc);
      } else {
        const newGallery = doc.querySelector('[id^="hv-media-gallery-"]');
        const oldGallery = this.productWrapper?.querySelector('[id^="hv-media-gallery-"]');
        if (newGallery && oldGallery) {
          oldGallery.innerHTML = newGallery.innerHTML;
          oldGallery.setAttribute('data-hv-filter', newGallery.getAttribute('data-hv-filter') || '1');
          const mode = newGallery.getAttribute('data-hv-gallery-mode');
          if (mode) oldGallery.setAttribute('data-hv-gallery-mode', mode);
        }
        const newThumbs = doc.querySelector('.product-thumbnail-container');
        const oldThumbs = this.productWrapper?.querySelector('.product-thumbnail-container');
        if (newThumbs && oldThumbs) {
          oldThumbs.innerHTML = newThumbs.innerHTML;
        }
      }
    }

    const newPicker = doc.querySelector('variant-selects-hv');
    if (newPicker) {
      const newVariations = newPicker.querySelector('.variations');
      if (newVariations && oldVariations) {
        oldVariations.innerHTML = newVariations.innerHTML;
        this.restoreSizeTable(oldVariations, sizeTable);
        this.restoreColorOrder(colorOrder);
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
