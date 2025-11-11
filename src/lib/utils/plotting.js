import * as d3 from "d3";

/**
 * Remove existing scatter group from SVG
 * @param {d3.Selection} svg - D3 SVG selection
 * @param {string} groupClass - CSS class of the scatter group (default: "scatter-group")
 */
export function removeScatterGroup(svg, groupClass = "scatter-group") {
  svg.selectAll(`g.${groupClass}`).remove();
}

/**
 * Append a new scatter group to SVG
 * @param {d3.Selection} svg - D3 SVG selection
 * @param {string} groupClass - CSS class for the scatter group (default: "scatter-group")
 * @returns {d3.Selection} - The newly created group selection
 */
export function appendScatterGroup(svg, groupClass = "scatter-group") {
  return svg.append("g").attr("class", groupClass);
}

/**
 * Plot scatter points on an SVG
 * @param {d3.Selection} svg - D3 SVG selection
 * @param {Object} dataset - Data object with structure {data: [{x, y}, ...], t: [...]}
 * @param {Object} scales - Scales object with structure {xScale, yScale}
 * @param {Object} options - Configuration options
 * @param {number} options.radius - Radius of scatter points (default: 5)
 * @param {string|Function} options.fillColor - Fill color as hex string or function (d, i, dataset) => color
 * @param {Array<number>} options.opacity - Array of opacity values per point, or defaults to uniform based on fillColor
 * @param {string} options.pointClass - CSS class for circle elements (default: "scatter-point")
 * @param {string} options.groupClass - CSS class for scatter group (default: "scatter-group")
 * @param {boolean} options.clearPrevious - Whether to remove existing scatter group (default: true)
 */
export function plotScatter(svg, dataset, scales, options = {}) {
  const {
    radius = 5,
    fillColor = "#1976d2",
    opacity = null,
    pointClass = "scatter-point",
    groupClass = "scatter-group",
    clearPrevious = true,
  } = options;

  const { xScale, yScale } = scales;
  const dataArr = dataset.data;

  // Remove previous scatter group if requested
  if (clearPrevious) {
    removeScatterGroup(svg, groupClass);
  }

  // Create new scatter group
  const scatterGroup = appendScatterGroup(svg, groupClass);

  // Determine opacity array
  let opacityArray = opacity;
  if (!opacityArray) {
    // Default to uniform opacity
    opacityArray = dataArr.map(() => 1);
  }

  // Ensure opacity array has same length as data
  if (opacityArray.length !== dataArr.length) {
    console.warn(
      `Opacity array length (${opacityArray.length}) doesn't match data length (${dataArr.length}). Using first value for all points.`
    );
    opacityArray = dataArr.map(() => opacityArray[0] ?? 1);
  }

  // Create scatter points
  scatterGroup
    .selectAll(`circle.${pointClass}`)
    .data(dataArr)
    .enter()
    .append("circle")
    .attr("class", pointClass)
    .attr("cx", (d) => xScale(d.x))
    .attr("cy", (d) => yScale(d.y))
    .attr("r", radius)
    .attr("fill", (d, i) => {
      if (typeof fillColor === "function") {
        return fillColor(d, i, dataset);
      }
      return fillColor;
    })
    .attr("opacity", (d, i) => opacityArray[i]);
}