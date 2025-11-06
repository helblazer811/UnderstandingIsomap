import { writable } from "svelte/store";

export const showPCAProjection = writable(false);
export const showPCAVectors = writable(false);
export const showIntrinsicDimension = writable(false);
export const showScatter = writable(false);
export const showScatterPlotAnimation = writable(true);
export const showEpsilonBallGraph = writable(false);
export const epsilon = writable(0.1);
export const k = writable(5);
export const data = writable([]);
