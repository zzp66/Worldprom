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
  connectedCallback() {
    const span = this.querySelector('span');

    this.addEventListener('click', (e) => {
      e.preventDefault();
      // Look the container up on every click: filtering re-renders it, so a cached reference goes stale
      const drawer = document.getElementById('Sidebar-Container');
      const open = drawer.classList.toggle('facets--sidebar-open');

      // Remember the choice for this tab so paging and other sidebar collections keep it
      if (drawer.hasAttribute('data-remember-sidebar')) {
        try {
          window.sessionStorage.setItem('collection-sidebar-open', open ? '1' : '0');
        } catch (err) {}
      }

      span.textContent = drawer.classList.contains('facets--sidebar-open') ? theme.strings.hideFilters : theme.strings.showFilters;
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

  static async renderPage(searchParams, event, updateURLHash = true) {
    const requestId = ++FacetFiltersForm.requestId;
    const keepScroll = FacetFiltersForm.keepScrollCount > 0;
    if (keepScroll) FacetFiltersForm.keepScrollCount -= 1;
    FacetFiltersForm.searchParamsPrev = searchParams;
    const sections = FacetFiltersForm.getSections();
    FacetFiltersForm.setLoading(true);

    try {
      const requests = sections.map((section) => {
        const url = `${window.location.pathname}?section_id=${section.section}&${searchParams}`;
        const filterDataUrl = element => element.url === url;

        if (FacetFiltersForm.filterData.some(filterDataUrl)) {
          return FacetFiltersForm.renderSectionFromCache(filterDataUrl, event, requestId, keepScroll);
        }
        return FacetFiltersForm.renderSectionFromFetch(url, event, requestId, keepScroll);
      });
      if (updateURLHash) FacetFiltersForm.updateURLHash(searchParams);
      await Promise.all(requests);
    } catch (error) {
      console.error('Unable to update product filters:', error);
    } finally {
      // An older response must not clear the loading state of a newer filter request.
      if (requestId === FacetFiltersForm.requestId) {
        FacetFiltersForm.setLoading(false);
        FacetFiltersForm.toggleActiveFacets(false);
      }
    }
  }

  static setLoading(loading) {
    document.querySelectorAll('.thb-filter-count, .mobile-filter-count, #ProductGridContainer .products').forEach((element) => {
      element.classList.toggle('loading', loading);
    });
  }

  static renderSectionFromFetch(url, event, requestId, keepScroll) {
    return fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`Filter request failed: ${response.status}`);
        return response.text();
      })
      .then((responseText) => {
        const html = responseText;
        FacetFiltersForm.filterData = [...FacetFiltersForm.filterData, {
          html,
          url
        }];
        if (requestId === FacetFiltersForm.requestId) {
          FacetFiltersForm.renderSection(html, event, keepScroll);
        }
      });
  }

  static renderSectionFromCache(filterDataUrl, event, requestId, keepScroll) {
    const html = FacetFiltersForm.filterData.find(filterDataUrl).html;
    if (requestId === FacetFiltersForm.requestId) {
      FacetFiltersForm.renderSection(html, event, keepScroll);
    }
  }

  static renderSection(html, event, keepScroll) {
    FacetFiltersForm.renderFilters(html, event);
    FacetFiltersForm.renderProductCount(html);
    FacetFiltersForm.renderProductGridContainer(html, keepScroll);
  }

  static renderProductGridContainer(html, keepScroll = false) {
    // Keep the sidebar open/closed as the visitor left it, instead of resetting to the template default
    const sidebarOpen = document.getElementById('Sidebar-Container')?.classList.contains('facets--sidebar-open');
    document.getElementById('ProductGridContainer').innerHTML = new DOMParser().parseFromString(html, 'text/html').getElementById('ProductGridContainer').innerHTML;
    document.getElementById('Sidebar-Container')?.classList.toggle('facets--sidebar-open', !!sidebarOpen);

    let top = document.getElementById('ProductGridContainer').getBoundingClientRect().top + document.documentElement.scrollTop - parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-height'), 10) - 30;

    // The animation bundle is only loaded when theme animations are enabled.
    if (document.body.classList.contains('animations-true') && typeof ScrollTrigger !== 'undefined' && typeof gsap !== 'undefined') {
      ScrollTrigger.batch('.animations-true .products .product-card--image-primary', {
        start: "top 90%",
        onEnter: (elements) => {
          gsap.to(elements, { scale: 1, opacity: 1, stagger: 0.15, ease: window.theme.settings.animation_easing });
        }
      });
    }
    document.getElementById('ProductGridContainer').querySelectorAll('.lazyload').forEach((image) => {
      lazySizes.loader.unveil(image);
    });

    // 顶部颜色色块筛选时保持当前位置（见 collection-color-swatch），其他筛选照常滚到商品区
    if (!keepScroll) {
      window.scrollTo({
        top: top,
        left: 0,
        behavior: "smooth"
      });
    }
  }

  static renderProductCount(html) {
    const countHtml = new DOMParser().parseFromString(html, 'text/html').getElementById('ProductCount');
    const container = document.getElementById('ProductCount');

    if (countHtml && container) {
      // The drawer has its own count markup, refreshed by renderAdditionalElements.
      container.innerHTML = countHtml.innerHTML;
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

// Mobile: show facets bar while scrolling; hide 3s after stop
(() => {
  const mq = window.matchMedia('(max-width: 767px)');
  let hideTimer = null;
  let rafId = null;

  const getBars = () => Array.from(document.querySelectorAll('facet-filters-form.facets--bar'));

  const ensureHeaderHeightVar = () => {
    const headerSection = document.querySelector('.section-header-section');
    if (!headerSection) return;
    const h = headerSection.clientHeight || 0;
    if (h > 0) {
      document.documentElement.style.setProperty('--header-height', `${h}px`);
    }
  };

  const setVisible = (visible) => {
    getBars().forEach((bar) => {
      bar.classList.toggle('is-visible', visible);
    });
  };

  const ensurePlaceholder = (bar) => {
    if (bar.__facetsPlaceholder) return bar.__facetsPlaceholder;
    const ph = document.createElement('div');
    ph.className = 'facets--bar-placeholder';
    bar.parentNode.insertBefore(ph, bar);
    bar.__facetsPlaceholder = ph;
    return ph;
  };

  const measure = () => {
    ensureHeaderHeightVar();
    getBars().forEach((bar) => {
      const ph = ensurePlaceholder(bar);
      // 固定时需要占位，防止页面跳动
      const h = bar.offsetHeight || 0;
      if (h > 0) ph.style.height = `${h}px`;
    });
  };

  const updateFixedState = () => {
    if (!mq.matches) return;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const headerH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-height'), 10) || 0;

    getBars().forEach((bar) => {
      const ph = ensurePlaceholder(bar);
      // 触发点始终用占位元素当前位置计算（占位始终在文档流里）
      const triggerTop = ph.getBoundingClientRect().top + scrollTop;

      // 超过原本位置（考虑 header 高度）才固定
      const shouldFix = scrollTop + headerH >= triggerTop;
      bar.classList.toggle('is-fixed', shouldFix);
      // fixed 时占位高度撑开；非 fixed 时占位高度归零
      ph.style.height = shouldFix ? `${bar.offsetHeight || 0}px` : '0px';
    });
  };

  const onScroll = () => {
    if (!mq.matches) return;
    // rAF 合并频繁 scroll 事件，避免抖动
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      updateFixedState();
      setVisible(true);
    });
    if (hideTimer) window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => {
      setVisible(false);
    }, 3000);
  };

  const onResize = () => {
    if (!mq.matches) {
      if (hideTimer) window.clearTimeout(hideTimer);
      hideTimer = null;
      // Desktop: do not toggle visibility classes/styles here.
      // Keep original sticky behavior controlled by CSS only.
      setVisible(false);
      return;
    }
    measure();
    updateFixedState();
    // mobile 初始：未超过触发点时保持正常位置显示；超过触发点才受 is-visible 控制
    setVisible(false);
  };

  // init
  onResize();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
})();

FacetFiltersForm.filterData = [];
FacetFiltersForm.requestId = 0;
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
