/**
 *  @class
 *  @function BackgroundVideo
 */
if (!customElements.get('background-video')) {
	class BackgroundVideo extends HTMLElement {
		constructor() {
			super();

			this.tl = false;
			this.splittext = false;
			this.paused = false;
			this.toggle = this.querySelector('.background-video__controls button');
		}
		connectedCallback() {
			let _this = this;
			if (document.body.classList.contains('animations-true') && typeof gsap !== 'undefined') {
				this.prepareAnimations();
			}
			// Video Support.
			this.video_container = this.querySelector('.background-video__iframe');

			if (this.video_container.querySelector('iframe')) {
				this.video_container.querySelector('iframe').onload = function () {
					_this.videoPlay();
				};
			}

			// Controls.
			if (this.toggle) {
				this.toggle.addEventListener('click', this.setupControlEvents.bind(this));
			}
		}
		disconnectedCallback() {
			if (document.body.classList.contains('animations-true') && typeof gsap !== 'undefined') {
				this.tl.kill();
				this.splittext.revert();
			}
		}
		setupControlEvents() {
			if (this.paused) {
				this.videoPlay();
				if (this.toggle) {
					this.toggle.classList.remove('paused');
				}
			} else {
				this.videoPause();
				if (this.toggle) {
					this.toggle.classList.add('paused');
				}
			}
		}
		videoPlay() {
			setTimeout(() => {
				if (this.video_container.dataset.provider === 'youtube') {
					this.video_container.querySelector('iframe').contentWindow.postMessage(JSON.stringify({
						event: "command",
						func: "playVideo",
						args: ""
					}), "*");
				} else if (this.video_container.dataset.provider === 'vimeo') {
					this.video_container.querySelector('iframe').contentWindow.postMessage(JSON.stringify({
						method: "play"
					}), "*");
				} else if (this.video_container.dataset.provider === 'hosted') {
					this.video_container.querySelector('video').play();
				}

				this.paused = false;
			}, 10);
		}
		videoPause() {
			setTimeout(() => {
				if (this.video_container.dataset.provider === 'youtube') {
					this.video_container.querySelector('iframe').contentWindow.postMessage(JSON.stringify({
						event: "command",
						func: "pauseVideo",
						args: ""
					}), "*");
				} else if (this.video_container.dataset.provider === 'vimeo') {
					this.video_container.querySelector('iframe').contentWindow.postMessage(JSON.stringify({
						method: "pause"
					}), "*");
				} else if (this.video_container.dataset.provider === 'hosted') {
					this.video_container.querySelector('video').pause();
				}
				this.paused = true;
			}, 10);
		}
		prepareAnimations() {
			let section = this;

			section.tl = gsap.timeline({
				scrollTrigger: {
					trigger: section,
					start: "top center"
				}
			});

			document.fonts.ready.then(function () {
				gsap.set(section.querySelectorAll('.subheading, .background-video__content--heading, .rte p, .video-lightbox-modal__opener button'), { visibility: 'visible' });
				section.splittext = new SplitText(section.querySelectorAll('.background-video__content--heading, .rte p'), {
					type: 'lines',
					linesClass: 'line-child'
				});
				section.mask = new SplitText(section.querySelectorAll('.background-video__content--heading,  .rte p'), {
					type: 'lines',
					linesClass: 'line-parent'
				});

				section.tl
					.fromTo(section.querySelector('.subheading'), {
						opacity: 0
					}, {
						duration: 0.25,
						opacity: 1
					});
				section.tl
					.from(section.querySelectorAll('.background-video__content--heading .line-child'), {
						duration: 0.75,
						yPercent: 120,
						stagger: 0.1,
						rotation: '2deg'
					}, '>-=0.3');
				section.tl
					.from(section.querySelectorAll('.rte p .line-child'), {
						duration: 0.5,
						yPercent: 120,
						stagger: 0.02,
						rotation: '2deg'
					}, '>-=0.3');
				section.tl
					.fromTo(section.querySelector('.video-lightbox-modal__opener button'), {
						autoAlpha: 0
					}, {
						duration: 0.5,
						autoAlpha: 1
					}, '>-=0.3');

			});
		}
	}
	customElements.define('background-video', BackgroundVideo);
}