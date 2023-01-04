import "./style.scss";

function add(a: number, b: number): number {
	return a + b;
}

document.addEventListener("DOMContentLoaded", init);

function init(): void {
	const div = document.querySelector("div") || undefined;
	if (div) div.innerHTML += add(42, 1337);
}
