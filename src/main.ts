import "./style.scss";

const TAU = Math.PI * 2;
const CATEGORIES = 12;
const TOPICS_PER_CATEGORY = 6;
const TOTAL_TOPICS = CATEGORIES * TOPICS_PER_CATEGORY;
const CATEGORY_ANGLE = TAU / CATEGORIES;
const CATEGORY_ANGLE_EXPANDED = (96 / 360) * TAU;
const SLICE_ANGLE = TAU / TOTAL_TOPICS;
const CONFLATION_FIX_ANGLE = 0.2 / TAU;
const SLICE_RADIUS = 120; // Slightly more than 100 so clipping can keep it circular
const ROTATION_SHIFT = (SLICE_ANGLE * TOPICS_PER_CATEGORY) / 2 + SLICE_ANGLE / 2;
const ANIMATION_LENGTH = 1000;

let animationCategory = 0;
let animationTimeStart = 0;
let animationTimeStop = ANIMATION_LENGTH;
let animationAngleStart = 0;
let animationAngleStop = 0;

window.addEventListener("keydown", (e) => {
	if (["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].includes(e.key)) {
		const opening = e.key !== "0";
		const index = e.key === "`" ? 0 : Number.parseInt(e.key, 10);
		if (opening) animationCategory = index;
		animationTimeStart = Date.now();
		animationTimeStop = animationTimeStart + ANIMATION_LENGTH;
		animationAngleStart = opening ? CATEGORY_ANGLE : CATEGORY_ANGLE_EXPANDED;
		animationAngleStop = opening ? CATEGORY_ANGLE_EXPANDED : CATEGORY_ANGLE;
	}
});

function init() {
	const slices = document.querySelector("[data-slices]") || undefined;
	const categorySeparators = document.querySelector("[data-category-separators]") || undefined;
	if (!slices || !categorySeparators) return;

	for (let i = 0; i < TOTAL_TOPICS; i += 1) {
		const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
		polygon.setAttribute("points", "0,0 0,0 0,0");
		polygon.setAttribute("fill", `var(--color-wheel-topic-${TOPICS_PER_CATEGORY - (i % TOPICS_PER_CATEGORY)})`);
		polygon.setAttribute("data-slice", "");
		slices.appendChild(polygon);
	}

	for (let i = 0; i < CATEGORIES; i += 1) {
		const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
		path.setAttribute("d", "m 0,0 c -1.7,36.5 -1.7,73.5 0,110 c 1.7,-36.5 1.7,-73.5 0,-110 z");
		path.setAttribute("fill", "black");
		path.setAttribute("data-category-separator", "");
		categorySeparators.appendChild(path);
	}

	updateSlices(0, CATEGORY_ANGLE);
	animate();
}

function updateSlices(expandedCategory: number, expandedCategoryAngle: number) {
	// Get all the slice polygon elements
	const slices = (Array.from(document.querySelectorAll("[data-slices] [data-slice]")) || undefined) as SVGPathElement[] | undefined;
	if (!slices) return;

	// Get all the category separator elements
	const categorySeparators = (Array.from(document.querySelectorAll("[data-category-separators] [data-category-separator]")) || undefined) as SVGPathElement[] | undefined;
	if (!categorySeparators) return;

	// Angle of expanded and shrunk slices
	const expandedSliceAngle = (expandedCategoryAngle / CATEGORY_ANGLE) * SLICE_ANGLE;
	const shrunkSliceAngle = (TAU - expandedSliceAngle * TOPICS_PER_CATEGORY) / (TOTAL_TOPICS - TOPICS_PER_CATEGORY);

	// Zero-indexed. Start is inclusive, stop is exclusive: [start, stop)
	// Example: 0, 6 which corresponds to the first six slices (0 through 5)
	// Example: 6, 12 which corresponds to the second six slices (6 through 11)
	const expandedRangeStart = expandedCategory * TOPICS_PER_CATEGORY;
	const expandedRangeStop = (expandedCategory + 1) * TOPICS_PER_CATEGORY;

	// Calculates the start and stop angle of a slice based on its index
	const sliceStartAndStopAngle = (index: number): [number, number] => {
		let startAngle;
		let stopAngle;
		if (index < expandedRangeStart) {
			// This slice comes before the expanded category
			startAngle = index * shrunkSliceAngle;
			stopAngle = startAngle + shrunkSliceAngle;
		} else if (index < expandedRangeStop) {
			// This slice is within the expanded category
			startAngle = expandedRangeStart * shrunkSliceAngle + (index - expandedRangeStart) * expandedSliceAngle;
			stopAngle = startAngle + expandedSliceAngle;
		} else {
			// This slice comes after the expanded category
			startAngle = expandedRangeStart * shrunkSliceAngle + (expandedRangeStop - expandedRangeStart) * expandedSliceAngle + (index - expandedRangeStop) * shrunkSliceAngle;
			stopAngle = startAngle + shrunkSliceAngle;
		}
		return [startAngle, stopAngle];
	};

	// Calculate the start and stop angles of the expanded range, both where it would be if it wasn't expanded and where it is when expanded
	const expandedRangeStartAngleWhenUnexpanded = expandedRangeStart * SLICE_ANGLE;
	const expandedRangeStopAngleWhenUnexpanded = expandedRangeStop * SLICE_ANGLE;
	const expandedRangeStartAngleWhenExpanded = sliceStartAndStopAngle(expandedRangeStart)[0];
	const expandedRangeStopAngleWhenExpanded = sliceStartAndStopAngle(expandedRangeStop)[1];

	// Compare those range angles when not expanded and when expanded to find how to rotate everything to center the expansion on the expanding category
	const startAngleDifference = expandedRangeStartAngleWhenExpanded - expandedRangeStartAngleWhenUnexpanded;
	const stopAngleDifference = expandedRangeStopAngleWhenExpanded - expandedRangeStopAngleWhenUnexpanded;
	const angleOffsetToRecenter = -startAngleDifference - (stopAngleDifference - startAngleDifference) / 2;

	// Update the angles of each slice polygon
	slices.forEach((slice, index) => {
		const conflationFix = index === slices.length - 1 ? 0 : CONFLATION_FIX_ANGLE;

		// Pick the start and stop angle for this slice
		const startStopAngle = sliceStartAndStopAngle(index);
		const startAngle = ROTATION_SHIFT + startStopAngle[0] + angleOffsetToRecenter;
		const stopAngle = ROTATION_SHIFT + startStopAngle[1] + angleOffsetToRecenter;

		// Write the vertex angles to the polygon for this slice
		const startX = -Math.sin(startAngle) * SLICE_RADIUS;
		const startY = -Math.cos(startAngle) * SLICE_RADIUS;
		const stopX = -Math.sin(stopAngle + conflationFix) * SLICE_RADIUS;
		const stopY = -Math.cos(stopAngle + conflationFix) * SLICE_RADIUS;
		slice.setAttribute("points", `0,0 ${startX},${startY} ${stopX},${stopY}`);

		// Set the category separator angle
		if (index % TOPICS_PER_CATEGORY === 0) {
			categorySeparators[index / TOPICS_PER_CATEGORY].setAttribute("transform", `rotate(${(-startAngle / TAU) * 360 + 180})`);
		}
	});
}

// const ease = (x: number) => 1 - (1 - x) * (1 - x);
const smootherstep = (x: number) => x * x * x * (x * (x * 6 - 15) + 10);

function animate() {
	let animationFraction = (Date.now() - animationTimeStart) / (animationTimeStop - animationTimeStart);
	if (animationFraction < 0) animationFraction = 0;
	if (animationFraction > 1) animationFraction = 1;

	const angle = animationAngleStart + (animationAngleStop - animationAngleStart) * smootherstep(animationFraction);
	updateSlices(animationCategory, angle);

	requestAnimationFrame(animate);
}

document.addEventListener("DOMContentLoaded", init);
