(function () {
  function fixColorSwatches(root) {
    (root || document).querySelectorAll('.product-form__input--color label[style]').forEach((label) => {
      const style = label.getAttribute('style') || '';
      if (style.includes("url('')") || style.includes('url("")')) {
        label.style.setProperty('--option-color-image', 'none');
      }
    });
  }

  function unhideColorPickers(root) {
    (root || document).querySelectorAll(
      'fieldset[data-handle="color"], .product-form__input--color'
    ).forEach((el) => {
      el.style.setProperty('display', 'flex', 'important');
      el.style.setProperty('flex-direction', 'column', 'important');
      el.style.setProperty('flex-wrap', 'wrap', 'important');
      el.style.setProperty('visibility', 'visible', 'important');
      el.style.setProperty('height', 'auto', 'important');
      el.style.setProperty('max-height', 'none', 'important');
      el.style.setProperty('overflow', 'visible', 'important');
      el.style.setProperty('opacity', '1', 'important');
    });
  }

  function isColorFieldset(fieldset) {
    if (!fieldset) return false;
    const handle = (fieldset.dataset.handle || '').toLowerCase();
    const optionName = (fieldset.dataset.optionName || '').toLowerCase();
    return handle.includes('color') || handle.includes('colour') || optionName === 'color';
  }

  function getSelectedColorValue(picker) {
    const fieldsets = picker.querySelectorAll('fieldset');
    for (const fieldset of fieldsets) {
      if (!isColorFieldset(fieldset)) continue;
      const checked = fieldset.querySelector('input[type="radio"]:checked');
      if (checked) return checked.value;
      const select = fieldset.querySelector('select');
      if (select) return select.value;
    }
    return null;
  }

  function normalizeColorToken(value) {
    return String(value || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

  function getColorNeedles(picker) {
    const needles = [];
    picker.querySelectorAll('fieldset').forEach((fieldset) => {
      if (!isColorFieldset(fieldset)) return;
      fieldset.querySelectorAll('input[type="radio"]').forEach((input) => {
        const label = normalizeColorToken(input.dataset.colorLabel || input.value);
        if (label) needles.push(label);
      });
    });
    return needles;
  }

  function mediaMatchesColor(el, colorNeedle, allNeedles) {
    if (!el || !colorNeedle) return true;
    const assignedColor = normalizeColorToken(el.dataset.hvColor);
    if (assignedColor) return assignedColor === colorNeedle;

    const img = el.querySelector('img');
    const haystack = normalizeColorToken([
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

  function filterGalleryByColor(productWrapper, picker, colorValue) {
    if (!productWrapper || !colorValue) return;
    if (isSharedDetailMode(productWrapper)) return;
    const colorNeedle = normalizeColorToken(colorValue);
    if (!colorNeedle) return;

    const allNeedles = getColorNeedles(picker);
    const roots = [
      productWrapper.querySelector('[id^="hv-media-gallery-"]'),
      productWrapper.querySelector('.product-thumbnail-container'),
      productWrapper.querySelector('.product-images')
    ].filter(Boolean);

    const seen = new Set();
    roots.forEach((root) => {
      if (seen.has(root)) return;
      seen.add(root);
      const slides = root.querySelectorAll('.product-images__slide, .product-thumbnail, [data-media-id]');
      let firstVisible = null;
      slides.forEach((slide) => {
        if (slide.dataset.hvRole === 'shared') {
          slide.hidden = false;
          slide.style.display = '';
          return;
        }
        const match = mediaMatchesColor(slide, colorNeedle, allNeedles);
        slide.hidden = !match;
        slide.style.display = match ? '' : 'none';
        if (match && !firstVisible) firstVisible = slide;
      });
      if (firstVisible) {
        root.querySelectorAll('.is-active').forEach((el) => el.classList.remove('is-active'));
        firstVisible.classList.add('is-active');
      }
    });

    const sliderEl = productWrapper.querySelector('product-slider, product-slider-thumbnails');
    if (sliderEl && typeof sliderEl.connectedCallback === 'function') {
      sliderEl.connectedCallback();
    }
  }

  function isSharedDetailMode(productWrapper) {
    const gallery = productWrapper?.querySelector('[id^="hv-media-gallery-"]');
    return (gallery?.dataset.hvGalleryMode || 'per_color') === 'shared_detail';
  }

  function enhancePicker(picker) {
    if (!picker || picker.dataset.hvRuntimeEnhanced === '1') return;
    picker.dataset.hvRuntimeEnhanced = '1';

    const productWrapper = picker.closest('.thb-product-detail') || document.querySelector('.thb-product-detail');
    unhideColorPickers(picker);
    fixColorSwatches(picker);
    if (!isSharedDetailMode(productWrapper)) {
      filterGalleryByColor(productWrapper, picker, getSelectedColorValue(picker));
    }

    if (typeof picker.updateFromResponse === 'function') {
      const originalUpdate = picker.updateFromResponse.bind(picker);
      picker.updateFromResponse = function (doc, focusId, replaceGallery) {
        const colorChanged = arguments.length >= 3 ? replaceGallery : true;
        if (colorChanged) {
          originalUpdate(doc, focusId, true);
        } else {
          // Size-only: update price/variant, do not rebuild gallery
          if (originalUpdate.length >= 3) {
            originalUpdate(doc, focusId, false);
          } else {
            const newPicker = doc.querySelector('variant-selects-hv');
            if (newPicker) {
              const newVariations = newPicker.querySelector('.variations');
              const oldVariations = picker.querySelector('.variations');
              const sizeTable =
                typeof picker.preserveSizeTable === 'function'
                  ? picker.preserveSizeTable(oldVariations)
                  : (() => {
                      const el = oldVariations?.querySelector('.variant-size-table-wrapper');
                      if (el) el.remove();
                      return el || null;
                    })();
              if (newVariations && oldVariations) {
                oldVariations.innerHTML = newVariations.innerHTML;
                if (typeof picker.restoreSizeTable === 'function') {
                  picker.restoreSizeTable(oldVariations, sizeTable);
                } else if (sizeTable) {
                  const host =
                    oldVariations.querySelector('[data-handle="size"]')?.closest('.option-chose-box') ||
                    oldVariations;
                  oldVariations.querySelectorAll('.variant-size-table-wrapper').forEach((el) => el.remove());
                  host.appendChild(sizeTable);
                }
              }
              const newVariantJson = newPicker.querySelector('[data-selected-variant]');
              const oldVariantJson = picker.querySelector('[data-selected-variant]');
              if (newVariantJson && oldVariantJson) oldVariantJson.textContent = newVariantJson.textContent;
              if (typeof picker.getSelectedVariant === 'function') {
                picker.currentVariant = picker.getSelectedVariant();
              }
            }
            if (typeof picker.updateAddButton === 'function') picker.updateAddButton();
            if (typeof picker.updateVariantInput === 'function') picker.updateVariantInput();
            if (typeof picker.updateURL === 'function') picker.updateURL();
            fixColorSwatches(picker);
          }
        }

        const colorValue = getSelectedColorValue(picker);
        if (colorChanged && !isSharedDetailMode(productWrapper)) {
          filterGalleryByColor(productWrapper, picker, colorValue);
        }
        fixColorSwatches(picker);
      };
    }

    if (typeof picker.onVariantChange === 'function') {
      const originalChange = picker.onVariantChange.bind(picker);
      picker.onVariantChange = function (event) {
        const input = event.target;
        if (!input || !input.matches('input[type="radio"], select')) {
          return originalChange(event);
        }
        const changedFieldset = input.closest('fieldset');
        const colorChanged = isColorFieldset(changedFieldset);

        // Prefer patched updateFromResponse path inside original when possible
        const originalUpdate = picker.updateFromResponse;
        if (typeof originalUpdate === 'function' && originalUpdate.length < 3) {
          // Old signature always rebuilds gallery — run our own fetch path for size changes
          if (!colorChanged) {
            const selectedOptionValueIds = typeof picker.getSelectedOptionValueIds === 'function'
              ? picker.getSelectedOptionValueIds()
              : [];
            const baseUrl = input.dataset.productUrl || picker.productUrl || picker.dataset.productUrl || picker.dataset.url;
            const params = new URLSearchParams();
            params.set('section_id', picker.sectionId || picker.dataset.section);
            if (selectedOptionValueIds.length) params.set('option_values', selectedOptionValueIds.join(','));
            if (typeof picker.toggleAddButton === 'function') picker.toggleAddButton(true);
            fetch(`${baseUrl}?${params.toString()}`)
              .then((res) => res.text())
              .then((html) => {
                const doc = new DOMParser().parseFromString(html, 'text/html');
                picker.updateFromResponse(doc, input.id, false);
              })
              .catch((err) => console.error('HV runtime size change error:', err));
            return;
          }
        }

        originalChange(event);
        // Color change: do NOT filter the old gallery while section fetch is in flight.
        // Filtering early hides all slides (data-hv-color still matches previous color)
        // and makes color switching look broken on large HV products.
        if (colorChanged) {
          setTimeout(() => fixColorSwatches(picker), 300);
        }
      };
    } else {
      picker.addEventListener('change', (event) => {
        const input = event.target;
        if (!input.matches('input[type="radio"], select')) return;
        const colorChanged = isColorFieldset(input.closest('fieldset'));
        setTimeout(() => {
          fixColorSwatches(picker);
          // Size-only fallback path may not rebuild gallery; color changes wait for fetch.
          if (!colorChanged && !isSharedDetailMode(productWrapper)) {
            filterGalleryByColor(productWrapper, picker, getSelectedColorValue(picker));
          }
        }, 50);
      });
    }
  }

  function boot() {
    unhideColorPickers(document);
    fixColorSwatches(document);
    document.querySelectorAll('variant-selects-hv').forEach(enhancePicker);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  window.addEventListener('load', boot);
  document.addEventListener('shopify:section:load', boot);
})();
