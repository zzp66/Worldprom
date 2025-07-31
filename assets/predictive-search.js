/**
 *  @class
 *  @function Predictive Search
 */
if (!customElements.get('search-form')) {
  class SearchForm extends HTMLElement {
    constructor() {
      super();
    }
    connectedCallback() {
      this.container = document.getElementById('Search-Drawer');
      this.form = this.container.querySelector('form');
      this.input = this.container.querySelector('input[type="search"]');
      this.predictiveSearchResults = this.container.querySelector('.search-drawer--content');

      this.setupEventListeners();
    }

    setupEventListeners() {
      this.form.addEventListener('submit', this.onFormSubmit.bind(this));

      this.input.addEventListener('input', debounce((event) => {
        this.onChange(event);
      }, 300).bind(this));
    }

    getQuery() {
      return this.input.value.trim();
    }

    onChange() {
      const searchTerm = this.getQuery();

      if (!searchTerm.length) {
        this.predictiveSearchResults.innerHTML = '';
        this.predictiveSearchResults.classList.remove('loading');
        return;
      }
      this.predictiveSearchResults.classList.add('loading');
      this.getSearchResults(searchTerm);
    }

    onFormSubmit(event) {
      if (!this.getQuery().length) {
        event.preventDefault();
      }
    }

    onFocus() {
      const searchTerm = this.getQuery();

      if (!searchTerm.length) {
        return;
      }

      this.getSearchResults(searchTerm);
    }

    getSearchResults(searchTerm) {

      this.predictiveSearchResults.classList.add('loading');

      fetch(`${theme.routes.predictive_search_url}?q=${encodeURIComponent(searchTerm)}&${encodeURIComponent('resources[type]')}=product,collection,article,query,page&${encodeURIComponent('resources[limit]')}=10&resources[options][fields]=title,product_type,vendor,variants.title,variants.sku&section_id=predictive-search`)
        .then((response) => {
          this.predictiveSearchResults.classList.remove('loading');
          if (!response.ok) {
            var error = new Error(response.status);
            throw error;
          }

          return response.text();
        })
        .then((text) => {
          const resultsMarkup = new DOMParser().parseFromString(text, 'text/html').querySelector('#shopify-section-predictive-search').innerHTML;

          this.renderSearchResults(resultsMarkup);
        })
        .catch((error) => {
          throw error;
        });
    }

    renderSearchResults(resultsMarkup) {
      this.predictiveSearchResults.innerHTML = resultsMarkup;
      this.predictiveSearchResults.classList.remove('loading');

      ScrollTrigger.batch(this.predictiveSearchResults.querySelectorAll('.animations-true .product-card--image-primary'), {
        start: "top 90%",
        onEnter: (elements) => {
          gsap.to(elements, { scale: 1, opacity: 1, stagger: 0.15, ease: window.theme.settings.animation_easing });
        }
      });
      console.log('b');
      ScrollTrigger.batch(this.predictiveSearchResults.querySelectorAll('.animations-true .collection-card--link'), {
        start: "top 90%",
        onEnter: (elements) => {
          gsap.to(elements, { scale: 1, opacity: 1, stagger: 0.15, ease: window.theme.settings.animation_easing });
        }
      });
    }

    close() {
      this.container.classList.remove('active');
    }
  }
  customElements.define('search-form', SearchForm);
}