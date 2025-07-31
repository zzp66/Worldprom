/**
 *  @class
 *  @function CollectionTabs
 */

if (!customElements.get('collection-tabs')) {
  class CollectionTabs extends HTMLElement {
    constructor() {
      super();
    }
    connectedCallback() {
      setTimeout(() => {
        this.buttons = Array.from(this.querySelectorAll('button'));
        this.links = Array.from(this.closest('.collection-tabs').querySelectorAll('.linked-to-tab'));
        this.sectionHeader = this.closest('.section-header');
        if (!this.sectionHeader) return; // Ensure the existence of the section header
        this.target = this.dataset.target;
        this.themeScroll = this.sectionHeader.nextElementSibling;

        this.buttons.forEach((button, i) => {
          button.addEventListener('click', (event) => {
            this.toggleButtons(i);
            this.toggleLinks(i);
            if (button.dataset.collection) {
              this.toggleCollection(button.dataset.collection);
            }
            event.preventDefault();
          });
        });

        if (Shopify.designMode) {
          this.addEventListener('shopify:block:select', (event) => {
            const index = buttons.indexOf(event.target);
            if (index !== -1) {
              buttons[index].dispatchEvent(new Event('click'));
            }
          });
        }
      }, 10);
    }

    toggleButtons(index) {
      this.buttons.forEach((button) => button.classList.remove('active'));
      this.buttons[index].classList.add('active');
    }

    toggleLinks(index) {
      if (this.links.length) {
        this.links.forEach((link) => link.classList.remove('active'));
        this.links[index].classList.add('active');
      }
    }

    toggleCollection(handle) {
      const slider = document.getElementById(this.target);
      if (!slider) return; // Ensure the existence of the slider
      const products = slider.querySelectorAll(`.collection-tabs--product:not([data-collection="${handle}"])`);
      const activeProducts = slider.querySelectorAll(`[data-collection="${handle}"]`);

      products.forEach((product) => product.classList.remove('carousel__slide'));
      activeProducts.forEach((product) => product.classList.add('carousel__slide'));

      this.themeScroll.init();
      this.themeScroll.querySelector('.theme-scroll--inner').scroll({
        top: 0,
        left: 0
      });
    }
  }
  customElements.define('collection-tabs', CollectionTabs);
}