/**
 *  @class
 *  @function ProductRecommendations
 */
class ProductRecommendations extends HTMLElement {
	constructor() {
		super();

		this.parent = this.closest('.product-recommendations--parent');

	}
	fetchProducts() {
		fetch(this.dataset.url)
			.then(response => response.text())
			.then(text => {
				const html = document.createElement('div');
				html.innerHTML = text;
				const recommendations = html.querySelector('product-recommendations');

				if (recommendations && recommendations.innerHTML.trim().length) {
					this.innerHTML = recommendations.innerHTML;
				}

				this.classList.add('product-recommendations--loaded');

				setTimeout(() => {
					window.dispatchEvent(new Event('resize'));

					ScrollTrigger.batch(this.querySelectorAll('.animations-true .products .product-card--image-primary'), {
						start: "top 90%",
						onEnter: (elements) => {
							gsap.to(elements, { scale: 1, opacity: 1, stagger: 0.15, ease: window.theme.settings.animation_easing });
						}
					});
				});

			})
			.catch(e => {
				console.error(e);
			});
	}
	connectedCallback() {
		this.fetchProducts();
	}
}

customElements.define('product-recommendations', ProductRecommendations);
