import "./style.scss";

const TAU = Math.PI * 2;
const CATEGORIES_LIST = ["Impact", "Emotion", "Interactivity", "Embodiment", "Flow", "Cognition", "Enjoyment", "Time", "Scale", "Space", "Point of View", "Visuals/Sound"].reverse();
const EXPERIENCES_STATS = [
	// [0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
	[7.69, 7.72, 2.75, 4.83, 7.81, 8.42, 8.03, 7.61, 7.72, 8.33, 8.36, 8.17],
	[7.23, 8.57, 8.57, 8.27, 7.07, 9.0, 7.83, 8.87, 8.7, 8.47, 8.97, 8.67, 8.57],
	[6.82, 6.9, 5.8, 4.53, 7.17, 7.21, 7.4, 6.87, 7.6, 7.32, 7.86, 7.7],
	[6.59, 7.35, 5.71, 6.68, 7.53, 6.62, 6.94, 7.82, 8.24, 7.29, 6.88, 6.5],
	[7.61, 7.23, 7.03, 7.0, 8.3, 6.63, 7.03, 8.2, 7.73, 6.2, 8.13, 7.41],
	[7.57, 8.14, 7.71, 8.29, 8.25, 6.32, 6.89, 7.97, 8.43, 8.64, 8.43, 7.71],
] as const;
const CATEGORIES = CATEGORIES_LIST.length;
const TOPICS_PER_CATEGORY = 6;
const TOTAL_TOPICS = CATEGORIES * TOPICS_PER_CATEGORY;
const CATEGORY_ANGLE = TAU / CATEGORIES;
const CATEGORY_ANGLE_EXPANDED = (96 / 360) * TAU;
const SLICE_ANGLE = TAU / TOTAL_TOPICS;
const CONFLATION_FIX_ANGLE = 0.2 / TAU;
const EXPERIENCE_VALUE_OFFSET_DEGREES = 4;
const SLICE_RADIUS = 120; // Slightly more than 100 so clipping can keep it circular
const ROTATION_SHIFT = (SLICE_ANGLE * TOPICS_PER_CATEGORY) / 2 + SLICE_ANGLE / 2;
const ANIMATION_LENGTH = 1000;
const ANIMATION_LENGTH_CLOSE = ANIMATION_LENGTH / 2;

type Animation = {
	category: number;
	timeStart: number;
	timeStop: number;
	angleStart: number;
	angleStop: number;
};
let animation: Animation | undefined;

let openExperience;

function init() {
	instantiateSvgElements();
	animate();
	addExperienceButtonListeners();

	document.querySelector("[data-hub]")?.addEventListener("click", () => close());
}

function instantiateSvgElements() {
	const slices = document.querySelector("[data-slices]") || undefined;
	slices?.addEventListener("click", onClickSlice);
	if (!slices) return;

	const categorySeparators = document.querySelector("[data-category-separators]") || undefined;
	if (!categorySeparators) return;

	const experienceStats = document.querySelector("[data-experience-stats]") || undefined;
	if (!experienceStats) return;

	const categoryLabels = document.querySelector("[data-category-labels]") || undefined;
	if (!categoryLabels) return;

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

	for (let i = 0; i < CATEGORIES; i += 1) {
		const statLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
		statLine.setAttribute("x1", "0");
		statLine.setAttribute("y1", "0");
		statLine.setAttribute("x2", "0");
		statLine.setAttribute("y2", "-88");
		statLine.setAttribute("data-experience-stat", "");
		statLine.setAttribute("transform", `rotate(${(i / CATEGORIES) * 360})`);
		experienceStats.appendChild(statLine);
	}

	for (let i = 0; i < CATEGORIES; i += 1) {
		const valueText = document.createElementNS("http://www.w3.org/2000/svg", "text");
		valueText.setAttribute("data-experience-value", "");
		valueText.setAttribute("text-anchor", "middle");
		valueText.setAttribute("alignment-baseline", "middle");
		const rotation = (i / CATEGORIES) * 360 - EXPERIENCE_VALUE_OFFSET_DEGREES;
		valueText.setAttribute("style", `transform: rotate(${rotation}deg) translate(0, -24px) rotate(${-rotation}deg)`);
		experienceStats.appendChild(valueText);
	}

	CATEGORIES_LIST.forEach((category) => {
		const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
		text.setAttribute("x", "0");
		text.setAttribute("y", "-103");
		text.setAttribute("data-category-label", "");
		text.innerHTML = category;
		categoryLabels.appendChild(text);
	});
}

function updateSlices(expandedCategory: number, expandedCategoryAngle: number) {
	// Get all the slice polygon elements
	const slices = (Array.from(document.querySelectorAll("[data-slices] [data-slice]")) || undefined) as SVGPathElement[] | undefined;
	if (!slices) return;

	// Get all the category separator elements
	const categorySeparators = (Array.from(document.querySelectorAll("[data-category-separators] [data-category-separator]")) || undefined) as SVGPathElement[] | undefined;
	if (!categorySeparators) return;

	// Get all the category label elements
	const categoryLabels = (Array.from(document.querySelectorAll("[data-category-labels] [data-category-label]")) || undefined) as SVGPathElement[] | undefined;
	if (!categoryLabels) return;

	// Calculate the slice angles for each instance
	const sliceAngles = calculateSliceAngles(expandedCategory, expandedCategoryAngle);

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

		// Set the category label angle
		if ((index + TOPICS_PER_CATEGORY / 2) % TOPICS_PER_CATEGORY === 0) {
			categoryLabels[Math.floor(index / TOPICS_PER_CATEGORY)].setAttribute("transform", `rotate(${(-startAngle / TAU) * 360})`);
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
	let expandedCategory = 0;
	let expandedCategoryAngle = CATEGORY_ANGLE;

	if (animation) {
		const clamp = (x: number) => Math.max(Math.min(x, 1), 0);
		const smootherstep = (x: number) => x * x * x * (x * (x * 6 - 15) + 10);
		// const ease = (x: number) => 1 - (1 - x) * (1 - x);

		// Animation time from 0 to 1, clamped at either end if paused
		const animationFraction = clamp((Date.now() - animation.timeStart) / (animation.timeStop - animation.timeStart));

		expandedCategory = animation.category;
		expandedCategoryAngle = animation.angleStart + (animation.angleStop - animation.angleStart) * smootherstep(animationFraction);
	}

	updateSlices(expandedCategory, expandedCategoryAngle);

	requestAnimationFrame(animate);
}

function onClickSlice(e: Event) {
	const slice = e.target as SVGPolygonElement;
	const sliceIndex = Array.from(slice.parentElement!.children).indexOf(slice);
	const localSliceIndex = sliceIndex % TOPICS_PER_CATEGORY;
	const categoryIndex = Math.floor(sliceIndex / TOPICS_PER_CATEGORY);

	let currentlyOpenIndexCategory = animation?.timeStart && Date.now() >= animation?.timeStart && animation?.category;
	currentlyOpenIndexCategory = typeof currentlyOpenIndexCategory === "number" ? currentlyOpenIndexCategory : undefined;

	const currentlyOpen = currentlyOpenIndexCategory !== undefined && animation?.angleStop !== CATEGORY_ANGLE;

	if (currentlyOpen && categoryIndex === currentlyOpenIndexCategory) {
		console.log(`Opening local slice ${localSliceIndex} (slice ${sliceIndex}) in category ${categoryIndex}`);
	} else {
		const open = () => {
			animation = {
				category: categoryIndex,
				timeStart: Date.now(),
				timeStop: Date.now() + ANIMATION_LENGTH,
				angleStart: CATEGORY_ANGLE,
				angleStop: CATEGORY_ANGLE_EXPANDED,
			};
		};

		if (!currentlyOpen) open();
		else close(open);
	}
}

function close(then?: () => void) {
	let currentlyOpenIndexCategory = animation?.timeStart && Date.now() >= animation?.timeStart && animation?.category;
	currentlyOpenIndexCategory = typeof currentlyOpenIndexCategory === "number" ? currentlyOpenIndexCategory : undefined;

	const currentlyOpen = currentlyOpenIndexCategory !== undefined && animation?.angleStop !== CATEGORY_ANGLE;

	if (!currentlyOpen) return;

	// Close
	animation = {
		category: currentlyOpenIndexCategory || 0,
		timeStart: Date.now(),
		timeStop: Date.now() + ANIMATION_LENGTH_CLOSE,
		angleStart: CATEGORY_ANGLE_EXPANDED, // open ? CATEGORY_ANGLE : CATEGORY_ANGLE_EXPANDED,
		angleStop: CATEGORY_ANGLE, // open ? CATEGORY_ANGLE_EXPANDED : CATEGORY_ANGLE,
	};

	// Call an optional callback after the animation is done closing
	if (then) setTimeout(then, ANIMATION_LENGTH_CLOSE);
}

function addExperienceButtonListeners() {
	const experienceButtons = document.querySelectorAll("[data-experience-button]");
	experienceButtons.forEach((button) => {
		button.addEventListener("click", () => {
			button.classList.toggle("active");
			experienceButtons.forEach((otherButton) => {
				if (otherButton !== button) otherButton.classList.remove("active");
			});

			if (button.classList.contains("active")) {
				openExperience = Array.from(document.querySelectorAll("[data-experience-button]")).indexOf(button);
				if (typeof openExperience !== "number") return;

				document.body.classList.add("experience-stats-open");
				document.body.style.setProperty("--experience-color", `var(--color-wheel-topic-${openExperience + 1})`);

				const experienceNameOpen = document.querySelector("[data-experience-name].open");
				experienceNameOpen?.classList.remove("open");
				const experienceNames = Array.from(document.querySelectorAll("[data-experience-name]"));
				experienceNames[openExperience].classList.add("open");

				const x = openExperience;
				const experienceStats = Array.from(document.querySelectorAll("[data-experience-stat]"));
				experienceStats.forEach((statLine, i) => {
					if (!(statLine instanceof SVGElement)) return;
					statLine.style.setProperty("--stat-value", `${EXPERIENCES_STATS[x][i]}`);
				});

				const experienceValue = Array.from(document.querySelectorAll("[data-experience-value]"));
				experienceValue.forEach((valueText, i) => {
					if (!(valueText instanceof SVGElement)) return;

					const value = EXPERIENCES_STATS[x][i];

					valueText.innerHTML = value.toFixed(2);
					const rotation = (i / CATEGORIES) * 360 - EXPERIENCE_VALUE_OFFSET_DEGREES;
					valueText.setAttribute("style", `transform: rotate(${rotation}deg) translate(0, ${-(28 + 6 * value)}px) rotate(${-rotation}deg)`);
				});
			} else {
				openExperience = undefined;

				const experienceNameOpen = document.querySelector("[data-experience-name].open");
				experienceNameOpen?.classList.remove("open");

				const experienceValue = Array.from(document.querySelectorAll("[data-experience-value]"));
				experienceValue.forEach((valueText, i) => {
					if (!(valueText instanceof SVGElement)) return;

					const rotation = (i / CATEGORIES) * 360 - EXPERIENCE_VALUE_OFFSET_DEGREES;
					valueText.setAttribute("style", `transform: rotate(${rotation}deg) translate(0, -24px) rotate(${-rotation}deg)`);
				});

				document.body.classList.remove("experience-stats-open");
			}
		});
	});
}

document.addEventListener("DOMContentLoaded", init);
