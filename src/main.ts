import "./style.scss";

const CATEGORIES = 12;
const TOPICS_PER_CATEGORY = 6;
const TOTAL_TOPICS = CATEGORIES * TOPICS_PER_CATEGORY;
const SLICE_RADIUS = 120; // Slightly more than 100 so clipping can keep it circular
const CONFLATION_FIX_ANGLE = 0.2 / (Math.PI * 2);

function init(): void {
	const slices = document.querySelector("[data-slices]") || undefined;
	if (!slices) return;

	for (let i = 0; i < TOTAL_TOPICS; i += 1) {
		const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
		polygon.setAttribute("points", "0,0 0,0 0,0");
		polygon.setAttribute("fill", `var(--color-wheel-topic-${TOPICS_PER_CATEGORY - (i % TOPICS_PER_CATEGORY)})`);
		polygon.setAttribute("data-slice", "");
		slices.appendChild(polygon);
	}

	updateSlices();
}

function updateSlices(): void {
	const slices = (Array.from(document.querySelectorAll("[data-slices] [data-slice]")) || undefined) as SVGPathElement[] | undefined;
	if (!slices) return;

	slices.forEach((slice, index) => {
		const conflationFix = index === slices.length - 1 ? 0 : CONFLATION_FIX_ANGLE;

		const sliceAngle = (Math.PI * 2) / TOTAL_TOPICS;
		const startAngle = sliceAngle * index;
		const stopAngle = sliceAngle * (index + 1) + conflationFix;

		const startX = -Math.sin(startAngle) * SLICE_RADIUS;
		const startY = -Math.cos(startAngle) * SLICE_RADIUS;
		const stopX = -Math.sin(stopAngle) * SLICE_RADIUS;
		const stopY = -Math.cos(stopAngle) * SLICE_RADIUS;
		slice.setAttribute("points", `0,0 ${startX},${startY} ${stopX},${stopY}`);
	});
}

document.addEventListener("DOMContentLoaded", init);
