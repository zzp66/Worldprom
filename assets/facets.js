/**
 *  @class
 *  @function FacetsToggle
 */
class FacetsToggle extends HTMLElement {
  constructor() {
    super();
    this.drawer = document.getElementById('Facet-Drawer');
  }
  connectedCallback() {
    this.addEventListener('click', () => {
      document.body.classList.toggle('open-cc');
      this.drawer.classList.toggle('active');
      this.drawer.removeAttribute('inert');
    });
  }
}
customElements.define('facet-toggle', FacetsToggle);

/**
 *  @class
 *  @function SidebarToggle
 */
class SidebarToggle extends HTMLElement {
  constructor() {
    super();
    this.drawer = document.getElementById('Sidebar-Container');
  }
  connectedCallback() {
    const span = this.querySelector('span');
    const hideFilters = span.textContent;

    this.addEventListener('click', (e) => {
      e.preventDefault();
      this.drawer.classList.toggle('facets--sidebar-open');

      span.textContent = this.drawer.classList.contains('facets--sidebar-open') ? hideFilters : theme.strings.showFilters;
    });
  }
}
customElements.define('sidebar-toggle', SidebarToggle);
/**
 *  @class
 *  @function FacetFiltersForm
 */
class FacetFiltersForm extends HTMLElement {
  constructor() {
    super();
    this.onActiveFilterClick = this.onActiveFilterClick.bind(this);

    this.debouncedOnSubmit = debounce((event) => {
      this.onSubmitHandler(event);
    }, 500);

    this.querySelectorAll('.thb-filter-content--button').forEach((more_button) => {
      more_button.addEventListener('click', this.onMore);
    });
    this.querySelector('form').addEventListener('input', this.debouncedOnSubmit.bind(this));
  }

  static setListeners() {
    const onHistoryChange = (event) => {
      const searchParams = event.state ? event.state.searchParams : FacetFiltersForm.searchParamsInitial;
      if (searchParams === FacetFiltersForm.searchParamsPrev) return;
      FacetFiltersForm.renderPage(searchParams, null, false);
    };
    window.addEventListener('popstate', onHistoryChange);
  }

  static toggleActiveFacets(disable = true) {
    document.querySelectorAll('.js-facet-remove').forEach((element) => {
      element.classList.toggle('disabled', disable);
    });
  }

  static renderPage(searchParams, event, updateURLHash = true) {
    FacetFiltersForm.searchParamsPrev = searchParams;
    const sections = FacetFiltersForm.getSections();
    const container = document.querySelectorAll('.thb-filter-count, .mobile-filter-count');
    document.getElementById('ProductGridContainer').querySelector('.products').classList.add('loading');

    for (var item of container) {
      item.classList.add('loading');
    }

    sections.forEach((section) => {
      const url = `${window.location.pathname}?section_id=${section.section}&${searchParams}`;
      const filterDataUrl = element => element.url === url;

      if (FacetFiltersForm.filterData.some(filterDataUrl)) {
        FacetFiltersForm.renderSectionFromCache(filterDataUrl, event);
      } else {
        FacetFiltersForm.renderSectionFromFetch(url, event);
      }
    });
    if (updateURLHash) FacetFiltersForm.updateURLHash(searchParams);

  }

  static renderSectionFromFetch(url, event) {
    fetch(url)
      .then(response => response.text())
      .then((responseText) => {
        const html = responseText;
        FacetFiltersForm.filterData = [...FacetFiltersForm.filterData, {
          html,
          url
        }];
        FacetFiltersForm.renderFilters(html, event);
        FacetFiltersForm.renderProductGridContainer(html);
        FacetFiltersForm.renderProductCount(html);

      });
  }

  static renderSectionFromCache(filterDataUrl, event) {
    const html = FacetFiltersForm.filterData.find(filterDataUrl).html;
    FacetFiltersForm.renderFilters(html, event);
    FacetFiltersForm.renderProductGridContainer(html);
    FacetFiltersForm.renderProductCount(html);

  }

  static renderProductGridContainer(html) {
    document.getElementById('ProductGridContainer').innerHTML = new DOMParser().parseFromString(html, 'text/html').getElementById('ProductGridContainer').innerHTML;

    let top = document.getElementById('ProductGridContainer').getBoundingClientRect().top + document.documentElement.scrollTop - parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-height'), 10) - 30;

    ScrollTrigger.batch('.animations-true .products .product-card--image-primary', {
      start: "top 90%",
      onEnter: (elements) => {
        gsap.to(elements, { scale: 1, opacity: 1, stagger: 0.15, ease: window.theme.settings.animation_easing });
      }
    });
    document.getElementById('ProductGridContainer').querySelectorAll('.lazyload').forEach((image) => {
      lazySizes.loader.unveil(image);
    });

    window.scrollTo({
      top: top,
      left: 0,
      behavior: "smooth"
    });
  }

  static renderProductCount(html) {
    const countHtml = new DOMParser().parseFromString(html, 'text/html').getElementById('ProductCount');
    const container = document.getElementsByClassName('thb-filter-count');

    if (countHtml) {
      for (var item of container) {
        item.innerHTML = countHtml.innerHTML;
        item.classList.remove('loading');
      }
    }

  }

  static renderFilters(html, event) {
    const parsedHTML = new DOMParser().parseFromString(html, 'text/html');

    const facetDetailsElements =
      parsedHTML.querySelectorAll('#FacetFiltersForm collapsible-row, #FacetFiltersFormMobile collapsible-row');
    const matchesIndex = (element) => {
      const jsFilter = event ? event.target.closest('collapsible-row') : undefined;
      return jsFilter ? element.dataset.index === jsFilter.dataset.index : false;
    };
    const facetsToRender = Array.from(facetDetailsElements).filter(element => !matchesIndex(element));
    const countsToRender = Array.from(facetDetailsElements).find(matchesIndex);

    facetsToRender.forEach((element) => {
      document.querySelector(`collapsible-row[data-index="${element.dataset.index}"]`).innerHTML = element.innerHTML;
    });

    FacetFiltersForm.renderActiveFacets(parsedHTML);
    FacetFiltersForm.renderAdditionalElements(parsedHTML);


    if (countsToRender) FacetFiltersForm.renderCounts(countsToRender, event.target.closest('collapsible-row'));
  }

  static renderActiveFacets(html) {
    const activeFacetElementSelectors = ['.active-facets'];

    activeFacetElementSelectors.forEach((selector) => {
      const activeFacetsElement = html.querySelector(selector);
      if (!activeFacetsElement) return;
      document.querySelector(selector).innerHTML = activeFacetsElement.innerHTML;
    });

    FacetFiltersForm.toggleActiveFacets(false);
  }

  static renderAdditionalElements(html) {
    const mobileElementSelectors = ['.mobile-filter-count'];

    mobileElementSelectors.forEach((selector) => {
      if (!html.querySelector(selector)) return;
      document.querySelector(selector).innerHTML = html.querySelector(selector).innerHTML;
      document.querySelector(selector).classList.remove('loading');
    });

  }

  static renderCounts(source, target) {
    const targetElement = target.querySelector('.facets__selected');
    const sourceElement = source.querySelector('.facets__selected');

    if (sourceElement && targetElement) {
      target.querySelector('.facets__selected').outerHTML = source.querySelector('.facets__selected').outerHTML;
    }
  }

  static updateURLHash(searchParams) {
    history.pushState({
      searchParams
    }, '', `${window.location.pathname}${searchParams && '?'.concat(searchParams)}`);
  }

  static getSections() {
    return [
      {
        section: document.getElementById('product-grid').dataset.id,
      }];
  }

  onSubmitHandler(event) {
    event.preventDefault();
    const formData = new FormData(event.target.closest('form'));
    const searchParams = new URLSearchParams(formData);
    if (searchParams.get('filter.v.price.gte') === "0.00") {
      searchParams.delete('filter.v.price.gte');
    }
    if (document.querySelector('.price_slider')) {
      if (searchParams.get('filter.v.price.lte') === parseFloat(document.querySelector('.price_slider').dataset.max).toFixed(2)) {
        searchParams.delete('filter.v.price.lte');
      }
    }
    FacetFiltersForm.renderPage(searchParams.toString(), event);
  }

  onActiveFilterClick(event) {
    event.preventDefault();
    FacetFiltersForm.toggleActiveFacets();
    const url = event.currentTarget.href.indexOf('?') == -1 ? '' : event.currentTarget.href.slice(event.currentTarget.href.indexOf('?') + 1);
    FacetFiltersForm.renderPage(url);
  }

  onMore(e) {
    let ul = this.closest('.thb-filter-content').querySelector('ul');

    if (ul.hasAttribute('filters-open')) {
      this.textContent = theme.strings.showMore;
      ul.removeAttribute('filters-open');
    } else {
      this.textContent = theme.strings.showLess;
      ul.setAttribute('filters-open', '');
    }
    e.preventDefault();
  }
}

FacetFiltersForm.filterData = [];
FacetFiltersForm.searchParamsInitial = window.location.search.slice(1);
FacetFiltersForm.searchParamsPrev = window.location.search.slice(1);
customElements.define('facet-filters-form', FacetFiltersForm);
FacetFiltersForm.setListeners();

/**
 *  @class
 *  @function FacetRemove
 */
class FacetRemove extends HTMLElement {
  constructor() {
    super();
    this.querySelectorAll('a').forEach((item) => {
      item.addEventListener('click', (event) => {
        event.preventDefault();
        const form = this.closest('facet-filters-form') || document.querySelector('facet-filters-form');
        form.onActiveFilterClick(event);
      });
    });
  }
}

customElements.define('facet-remove', FacetRemove);


/**
 *  @class
 *  @function FacetToolbar
 */
class FacetToolbar extends HTMLElement {
  constructor() {
    super();
  }
  connectedCallback() {
    this.productGrid = this.closest('#ProductGridContainer');
    this.compareToggle = this.querySelector('#compare_toggle');
    this.layoutSwitcher = this.querySelector('.facets--bar-view-as');
    this.buttons = this.querySelectorAll('.facets--bar-view-as-button');
    this.productLayout = window.localStorage.getItem('product-layout');
    if (this.layoutSwitcher) {
      this.buttons.forEach((button) => {
        button.addEventListener('click', (evt) => {
          [].forEach.call(this.buttons, function (el) {
            el.removeAttribute('disabled');
          });
          this.onLayoutChange(button, button.dataset.value);
          evt.preventDefault();
        });
      });

      if (this.productLayout && this.productLayout === 'list') {
        const toggle = this.querySelector(`.facets--bar-view-as-button-${this.productLayout}`);
        if (toggle) toggle.click();
      }
    }
    if (this.compareToggle) {
      this.compareToggle.addEventListener('change', this.onCompare);
    }
  }
  onLayoutChange(button, value) {
    button.setAttribute('disabled', '');
    this.productGrid.dataset.layout = value;
    window.localStorage.setItem('product-layout', value);
  }
  onCompare(e) {
    document.body.classList.toggle('compare-true');
    e.preventDefault();
  }
}
customElements.define('facet-toolbar', FacetToolbar);

/**
 *  @class
 *  @function PriceSlider
 */
class PriceSlider extends HTMLElement {

  constructor() {
    super();
  }
  connectedCallback() {
    this.slider = this.querySelector('.price_slider');
    this.amounts = this.querySelector('.price_slider_amount');
    this.form = this.closest('facet-filters-form') || document.querySelector('facet-filters-form');
    this.inputEvent = new CustomEvent('input');

    const args = {
      start: [
        parseFloat(this.slider.dataset.minValue || 0),
        parseFloat(this.slider.dataset.maxValue || this.slider.dataset.max)
      ],
      connect: true,
      step: 10,
      direction: document.dir,
      handleAttributes: [
        { 'aria-label': 'lower' },
        { 'aria-label': 'upper' },
      ],
      range: {
        'min': 0,
        'max': parseFloat(this.slider.dataset.max)
      }
    };
    noUiSlider.create(this.slider, args);

    this.slider.noUiSlider.on('update', this.onSliderUpdate.bind(this));
    this.slider.noUiSlider.on('change', this.onSliderChange.bind(this));

  }
  onSliderUpdate(values) {
    this.amounts.querySelector('.field__input_min').value = values[0];
    this.amounts.querySelector('.field__input_max').value = values[1];
  }

  onSliderChange(values) {
    this.form.querySelector('form').dispatchEvent(this.inputEvent);
  }
}
customElements.define('price-slider', PriceSlider);