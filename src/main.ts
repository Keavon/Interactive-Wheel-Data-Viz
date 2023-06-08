import { CONTENT_TEXT, CONTENT_IMAGE_FOLDERS, CONTENT_IMAGE_NAMES, EXPERIENCES_STATS } from "./content-text";
import "./style.scss";

const TAU = Math.PI * 2;
const CATEGORIES_LIST = Object.keys(CONTENT_TEXT).reverse() as Array<keyof typeof CONTENT_TEXT>;
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
const ANIMATION_LENGTH = 500;
const ANIMATION_LENGTH_CLOSE = ANIMATION_LENGTH;

type Animation = {
	category: number;
	timeStart: number;
	timeStop: number;
	angleStart: number;
	angleStop: number;
};
let animation: Animation | undefined;

document.addEventListener("DOMContentLoaded", init);

function init() {
	instantiateSvgElements();
	animate();

	const experienceButtons = document.querySelectorAll("[data-experience-button]");
	experienceButtons.forEach((button) => {
		button.addEventListener("click", () => {
			if (button.classList.contains("active")) {
				closeExperienceStats();
			} else {
				const openExperience = Array.from(document.querySelectorAll("[data-experience-button]")).indexOf(button);
				openExperienceStats(openExperience);
			}
		});
	});

	["[data-background]", "[data-hub]", "[data-experience-stats]", "[data-slice-content]"].forEach((selector) => {
		document.querySelector(selector)?.addEventListener("click", () => goBack());
	});

	window.addEventListener("mousemove", (e) => {
		Array.from(document.querySelectorAll("[data-slice].category-hovered")).forEach((slice) => {
			slice.classList.remove("category-hovered");
		});

		if (e.target instanceof SVGPolygonElement) {
			const slices = Array.from(document.querySelectorAll("[data-slice]"));
			const sliceIndex = slices.findIndex((slice) => slice === e.target);
			const categoryIndexStart = Math.floor(sliceIndex / TOPICS_PER_CATEGORY) * TOPICS_PER_CATEGORY;
			const categoryIndexEnd = categoryIndexStart + TOPICS_PER_CATEGORY;

			for (let i = categoryIndexStart; i < categoryIndexEnd; i += 1) {
				slices[i].classList.add("category-hovered");
			}
		}
	});

	preloadImages();
}

function preloadImages() {
	CONTENT_IMAGE_FOLDERS.forEach((folder) => {
		CONTENT_IMAGE_NAMES.forEach((name) => {
			const img = new Image();
			img.src = `images/${folder}/${name}`;
		});
	});
}

function instantiateSvgElements() {
	const slices = document.querySelector("[data-slices]") || undefined;
	slices?.addEventListener("pointerup", onClickSlice);
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
		polygon.setAttribute(
			"style",
			`
			--slice-color: var(--color-wheel-topic-${TOPICS_PER_CATEGORY - (i % TOPICS_PER_CATEGORY)});
			--slice-color-hover: var(--color-wheel-topic-${TOPICS_PER_CATEGORY - (i % TOPICS_PER_CATEGORY)}-hover)
			`.trim()
		);
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
		slice.setAttribute("data-slice-start-angle", `${startAngle}`);
		if (stopAngle - startAngle > CATEGORY_ANGLE / TOPICS_PER_CATEGORY + 0.001) {
			slice.classList.add("category-expanded");
		} else {
			slice.classList.remove("category-expanded");
		}

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

	if (categoryIndex === currentlyOpenSlicesCategory()) {
		const experienceNames = Array.from(document.querySelectorAll("[data-experience-name]"));
		const openExperienceName = document.querySelector("[data-experience-name].open");
		const currentlyOpenSliceTopic = TOPICS_PER_CATEGORY - experienceNames.findIndex((experienceName) => experienceName === openExperienceName) - 1;

		if (localSliceIndex === currentlyOpenSliceTopic) {
			closeSliceContent();
		} else {
			openSliceContent(sliceIndex, categoryIndex, TOPICS_PER_CATEGORY - localSliceIndex - 1);
		}
	} else {
		closeSliceContent();
		openSlices(categoryIndex);
	}
}

function currentlyOpenSlicesCategory(): number | undefined {
	const category = animation?.timeStart && Date.now() >= animation?.timeStart && animation?.category;

	if (animation?.angleStop === CATEGORY_ANGLE) return undefined;

	return typeof category === "number" ? category : undefined;
}

function goBack() {
	const sliceContentOpen = document.body.classList.contains("slice-content-open");
	if (sliceContentOpen) {
		closeSliceContent();
		return;
	}

	const experienceStatsOpen = document.body.classList.contains("experience-stats-open");
	if (experienceStatsOpen) {
		closeExperienceStats();
		return;
	}

	const slicesOpen = currentlyOpenSlicesCategory() !== undefined && animation?.angleStop !== CATEGORY_ANGLE;
	if (slicesOpen) {
		// Close the slices
		closeSlices();
	}
}

// SLICES

function openSlices(categoryIndex: number) {
	closeExperienceStats();

	const open = () => {
		document.body.classList.add("slices-open");

		animation = {
			category: categoryIndex,
			timeStart: Date.now(),
			timeStop: Date.now() + ANIMATION_LENGTH,
			angleStart: CATEGORY_ANGLE,
			angleStop: CATEGORY_ANGLE_EXPANDED,
		};
	};

	if (currentlyOpenSlicesCategory() === undefined) {
		open();
	} else {
		goBack();

		// Call this after the animation is done closing
		setTimeout(open, ANIMATION_LENGTH_CLOSE);
	}
}

function closeSlices() {
	if (currentlyOpenSlicesCategory() !== undefined) {
		document.body.classList.remove("slices-open");

		animation = {
			category: currentlyOpenSlicesCategory() || 0,
			timeStart: Date.now(),
			timeStop: Date.now() + ANIMATION_LENGTH_CLOSE,
			angleStart: CATEGORY_ANGLE_EXPANDED,
			angleStop: CATEGORY_ANGLE,
		};
	}
}

// SLICE CONTENT

function openSliceContent(sliceIndex: number, categoryIndex: number, experienceIndex: number) {
	const categoryName = CATEGORIES_LIST[categoryIndex];
	const experienceText = CONTENT_TEXT[categoryName][experienceIndex];

	const categoryFolder = CONTENT_IMAGE_FOLDERS[categoryIndex];
	const experienceImageFileName = CONTENT_IMAGE_NAMES[experienceIndex];
	const experienceImage = `images/${categoryFolder}/${experienceImageFileName}`;

	const alreadyOpen = document.body.classList.contains("slice-content-open");

	document.body.classList.add("slice-content-open");
	document.body.style.setProperty("--slice-content-color", `var(--color-wheel-topic-${experienceIndex + 1})`);

	document.querySelector("[data-experience-name].open")?.classList.remove("open");
	document.querySelectorAll("[data-experience-name]")[experienceIndex].classList.add("open");

	const sliceClippingMaskPolygon = document.querySelector("#slice-content-open-slice-mask polygon");
	const sliceClippingMaskPath = document.querySelectorAll("[data-slice]") || undefined;
	if (!sliceClippingMaskPolygon || !sliceClippingMaskPath) return;

	const polygonElement = sliceClippingMaskPath[sliceIndex];

	const startX = -Math.sin(0) * SLICE_RADIUS;
	const startY = -Math.cos(0) * SLICE_RADIUS;
	const stopX = -Math.sin(CATEGORY_ANGLE_EXPANDED / TOPICS_PER_CATEGORY) * SLICE_RADIUS;
	const stopY = -Math.cos(CATEGORY_ANGLE_EXPANDED / TOPICS_PER_CATEGORY) * SLICE_RADIUS;
	sliceClippingMaskPolygon.setAttribute("points", `0,0 ${startX},${startY} ${stopX},${stopY}`);

	const updateAngle = (resetTransition: boolean) => {
		const sliceStartAngle = parseFloat(polygonElement?.getAttribute("data-slice-start-angle") || "");
		if (Number.isNaN(sliceStartAngle)) return;
		sliceClippingMaskPolygon.setAttribute("style", `transform: rotate(${(-sliceStartAngle / TAU) * 360}deg);${resetTransition ? "transition-duration: 0s;" : ""}`);
	};
	if (alreadyOpen) {
		updateAngle(false);
	} else {
		// 500ms is the duration of the transition specified in the CSS
		const keepUpdatingUntil = Date.now() + 500;
		const update = () => {
			if (Date.now() <= keepUpdatingUntil) {
				updateAngle(true);
				requestAnimationFrame(update);
			} else {
				updateAngle(false);
			}
		};
		update();
	}

	const sliceContentImageElement = document.querySelector("[data-slice-content-image]");
	if (!sliceContentImageElement) return;
	if (alreadyOpen) {
		sliceContentImageElement.classList.add("fade-out");
		setTimeout(() => {
			sliceContentImageElement.classList.remove("fade-out");
			sliceContentImageElement.setAttribute("href", experienceImage);
		}, 250);
	} else {
		sliceContentImageElement.setAttribute("href", experienceImage);
	}

	const sliceContentTextElement = document.querySelector("[data-slice-content-text]");
	if (!(sliceContentTextElement instanceof HTMLElement)) return;
	const placeText = () => {
		sliceContentTextElement.innerHTML = experienceText;
		let size = parseFloat(getComputedStyle(sliceContentTextElement).fontSize);
		sliceContentTextElement.style.setProperty("font-size", `${size}px`);
		while (size > 3 && sliceContentTextElement.scrollHeight > sliceContentTextElement.offsetHeight) {
			sliceContentTextElement.style.setProperty("font-size", `${size}px`);
			size -= 0.1;
		}
	};
	if (alreadyOpen) {
		sliceContentTextElement.classList.add("fade-out");
		setTimeout(() => {
			sliceContentTextElement.classList.remove("fade-out");
			placeText();
		}, 250);
	} else {
		placeText();
	}
}

function closeSliceContent() {
	document.body.classList.remove("slice-content-open");
	document.querySelector("[data-experience-name].open")?.classList.remove("open");
}

// EXPERIENCE STATS

function openExperienceStats(openExperience: number) {
	closeSlices();
	closeSliceContent();

	const activeExperienceButton = document.querySelector("[data-experience-button].active");
	if (activeExperienceButton instanceof HTMLElement) activeExperienceButton.classList.remove("active");
	document.querySelectorAll("[data-experience-button]")[openExperience].classList.add("active");

	document.body.classList.add("experience-stats-open");
	document.body.style.setProperty("--experience-color", `var(--color-wheel-topic-${openExperience + 1})`);

	document.querySelector("[data-experience-name].open")?.classList.remove("open");
	document.querySelectorAll("[data-experience-name]")[openExperience].classList.add("open");

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
}

function closeExperienceStats() {
	const activeExperienceButton = document.querySelector("[data-experience-button].active");
	if (activeExperienceButton instanceof HTMLElement) activeExperienceButton.classList.remove("active");

	document.querySelector("[data-experience-name].open")?.classList.remove("open");

	const experienceValue = Array.from(document.querySelectorAll("[data-experience-value]"));
	experienceValue.forEach((valueText, i) => {
		if (!(valueText instanceof SVGElement)) return;

		const rotation = (i / CATEGORIES) * 360 - EXPERIENCE_VALUE_OFFSET_DEGREES;
		valueText.setAttribute("style", `transform: rotate(${rotation}deg) translate(0, -24px) rotate(${-rotation}deg)`);
	});

	document.body.classList.remove("experience-stats-open");
}
