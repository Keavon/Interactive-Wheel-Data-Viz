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

type Animation = {
	category: number;
	timeStart: number;
	timeStop: number;
	angleStart: number;
	angleStop: number;
};
const animations: Record<string, Animation | undefined> = {
	categoryOpeningAnimation: undefined,
	categoryClosingAnimation: undefined,
};

window.addEventListener("keydown", (e) => {
	if (["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].includes(e.key)) {
		const opening = e.key !== "0";

		let index = e.key === "`" ? 0 : Number.parseInt(e.key, 10);
		if (animations.categoryOpeningAnimation) index = animations.categoryOpeningAnimation.category;

		animations.categoryOpeningAnimation = {
			category: index,
			timeStart: Date.now(),
			timeStop: Date.now() + ANIMATION_LENGTH,
			angleStart: opening ? CATEGORY_ANGLE : CATEGORY_ANGLE_EXPANDED,
			angleStop: opening ? CATEGORY_ANGLE_EXPANDED : CATEGORY_ANGLE,
		};
	}
});

function init() {
	instantiateSvgElements();
	animate();
}

function instantiateSvgElements() {
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
}

function updateSlices(expandedCategoryInstances: { expandedCategory: number; expandedCategoryAngle: number }[]) {
	// Get all the slice polygon elements
	const slices = (Array.from(document.querySelectorAll("[data-slices] [data-slice]")) || undefined) as SVGPathElement[] | undefined;
	if (!slices) return;

	// Get all the category separator elements
	const categorySeparators = (Array.from(document.querySelectorAll("[data-category-separators] [data-category-separator]")) || undefined) as SVGPathElement[] | undefined;
	if (!categorySeparators) return;

	// Calculate the slice angles for each instance, then average the angle of each slice from all its instances
	const instances = expandedCategoryInstances.length > 0 ? expandedCategoryInstances : [{ expandedCategory: 0, expandedCategoryAngle: CATEGORY_ANGLE }];
	const sliceAnglesInstances = instances.map((expandedCategory) => {
		return calculateSliceAngles(expandedCategory.expandedCategory, expandedCategory.expandedCategoryAngle);
	});
	const sliceAnglesSum = sliceAnglesInstances.reduce((acc, value) => {
		return acc.map((accEntry, index) => [accEntry[0] + value[index][0], accEntry[1] + value[index][1]]);
	});
	const sliceAngles = sliceAnglesSum.map((value) => {
		return [value[0] / sliceAnglesInstances.length, value[1] / sliceAnglesInstances.length] as [number, number];
	});

	// Update the angles of each slice polygon
	slices.forEach((slice, index) => {
		const [startAngle, stopAngle] = sliceAngles[index];
		const conflationFix = index === slices.length - 1 ? 0 : CONFLATION_FIX_ANGLE;

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

function calculateSliceAngles(expandedCategory: number, expandedCategoryAngle: number): [number, number][] {
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

	return new Array(TOTAL_TOPICS).fill(undefined).map((_, index) => {
		// Pick the start and stop angle for this slice
		const [start, stop] = sliceStartAndStopAngle(index);
		const startAngle = start + ROTATION_SHIFT + angleOffsetToRecenter;
		const stopAngle = stop + ROTATION_SHIFT + angleOffsetToRecenter;
		return [startAngle, stopAngle];
	});
}

function animate() {
	const clamp = (x: number) => Math.max(Math.min(x, 1), 0);
	const smootherstep = (x: number) => x * x * x * (x * (x * 6 - 15) + 10);
	// const ease = (x: number) => 1 - (1 - x) * (1 - x);

	const validAnimations = Object.values(animations).filter((animation) => animation) as Animation[];
	const animationInstances = validAnimations.map((animation) => {
		// Animation time from 0 to 1, clamped at either end if paused
		const animationFraction = clamp((Date.now() - animation.timeStart) / (animation.timeStop - animation.timeStart));

		const angle = animation.angleStart + (animation.angleStop - animation.angleStart) * smootherstep(animationFraction);
		return { expandedCategory: animation.category, expandedCategoryAngle: angle };
	});

	updateSlices(animationInstances);

	requestAnimationFrame(animate);
}

document.addEventListener("DOMContentLoaded", init);
