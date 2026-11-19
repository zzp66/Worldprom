/**
 *  @class
 *  @function Pagination
 */

if (!customElements.get('pagination-theme')) {
  class Pagination extends HTMLElement {
    constructor() {
      super();
      const id = this.dataset.section;
      this.button = this.querySelector('.load-more');
      this.grid = document.querySelector('[data-id=' + id + ']');
      this.animations_enabled = document.body.classList.contains('animations-true') && typeof gsap !== 'undefined';
      this.i = 1;
    }
    connectedCallback() {
      // No load-more link means this is the last page
      if (!this.button) {
        return;
      }
      if (this.classList.contains('pagination-type--loadmore')) {
        this.loadMore();
      }
      if (this.classList.contains('pagination-type--infinite')) {
        this.infinite();
      }
    }
    loadMore() {
      let base = this;
      this.button.addEventListener('click', function (event) {
        event.preventDefault();
        base.loadProducts();
        this.blur();
      });
    }
    infinite() {
      let base = this;
      base.observer = new IntersectionObserver(function (entries) {
        if (entries[0].intersectionRatio === 1) {
          base.loadProducts();
        }
      }, {
        threshold: [0, 1]
      });
      base.observer.observe(base);
    }
    loadProducts() {
      let base = this;
      if (base.getAttribute('loading') || !base.button) {
        return;
      }
      // The link holds the next page URL. Fetch only the product grid section, not the whole page
      let page_url = base.button.getAttribute('href'),
        url = new URL(page_url, document.location.origin);
      url.searchParams.set('section_id', base.dataset.section);

      base.setAttribute('loading', true);
      fetch(url.toString())
        .then(response => response.text())
        .then((responseText) => {
          base.i++;
          base.renderProducts(responseText);

          dispatchCustomEvent('pagination:page-changed', {
            url: page_url
          });
        })
        .finally(() => {
          base.removeAttribute('loading');
        });
    }
    renderProducts(html) {
      let base = this,
        doc = new DOMParser().parseFromString(html, 'text/html'),
        grid_to_replace = doc.getElementById('product-grid'),
        next_link = doc.querySelector('pagination-theme .load-more');

      if (grid_to_replace) {
        let products = grid_to_replace.querySelectorAll('.products--column');

        for (var i = 0; i < products.length; i++) {
          products[i].dataset.pagination = base.i;
          this.grid.appendChild(products[i]);
          products[i].querySelectorAll('.lazyload').forEach((image) => {
            lazySizes.loader.unveil(image);
          });
        }
        if (this.animations_enabled) {
          let added_columns = this.grid.querySelectorAll('[data-pagination="' + base.i + '"]'),
            to_animate = [];
          for (var j = 0; j < added_columns.length; j++) {
            to_animate[j] = added_columns[j].querySelector('.product-card--image-primary');
          }
          gsap.to(to_animate, { scale: 1, opacity: 1, stagger: 0.15, ease: window.theme.settings.animation_easing });
        }
      }

      // The fetched page has its own link only if there is a page after it
      if (next_link) {
        base.button.setAttribute('href', next_link.getAttribute('href'));
      } else {
        if (base.observer) {
          base.observer.unobserve(base);
        }
        base.button.remove();
        base.button = null;
      }
    }
  }
  customElements.define('pagination-theme', Pagination);
}
