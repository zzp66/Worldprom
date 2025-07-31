/**
 *  @class
 *  @function FeaturedCollectionList
 */

if (!customElements.get('featured-collection-list')) {
  class FeaturedCollectionList extends HTMLElement {
    constructor() {
      super();

      this.images = this.querySelectorAll('.featured-collection-list--img');
      this.buttons = this.querySelectorAll('.featured-collection-list--button');
      this.descriptions = this.querySelectorAll('.featured-collection-list--description');

    }
    connectedCallback() {
      this.buttons.forEach((button, i) => {
        button.addEventListener('mouseover', (event) => {
          let i = button.dataset.index;
          this.onHover(event, button, i);
        });
      });
      if (Shopify.designMode) {
        this.addEventListener('shopify:block:select', (event) => {
          let index = this.buttons.indexOf(event.target);
          this.buttons[index].dispatchEvent(new Event('mouseover'));
        });
      }
    }
    onHover(event, button, i) {
      this.images.forEach((image, index) => {
        image.classList.remove('active');
        if (i == index + 1) {
          image.classList.add('active');
        }
      });
      this.buttons.forEach((this_button) => {
        this_button.classList.remove('active');
      });
      this.descriptions.forEach((description) => {
        description.classList.remove('active');
      });
      this.descriptions[i - 1].classList.add('active');
      button.classList.add('active');
    }
  }
  customElements.define('featured-collection-list', FeaturedCollectionList);
}