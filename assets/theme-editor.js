window.addEventListener('load', () => {

	document.addEventListener('shopify:section:load', function (event) {
		const section = event.target;

		if (section.classList.contains('product-section')) {
			window.dispatchEvent(new Event('resize'));
		}
		ScrollTrigger.killAll();
		document.dispatchEvent(new Event('theme:reload_animations'));
		setTimeout(() => {
			window.theme_animation_instances.forEach(instance => {
				instance.update();
			});
		}, 10);
	});
});
