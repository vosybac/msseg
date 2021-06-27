var COLOR_DIFF_FILTER_THRESHOLD = 5;
var COLOR_DIFF_NEIGHBOR_THRESHOLD =  50;
var NUMBER_OF_CHANNELS = 4;
var NUMBER_OF_USED_CHANNELS = 3;

function test() {
	console.log('hello');
}

function MeanShiftFilter(input, output,  radius) {
	var maxIterations = 5;
	var width = input.width;
	var height = input.height;
	var size = width*height;
	var node_path = new Int32Array(size);

	//Initialize and arrray;
	var isNodeUpdated = [];
	for (var i = 0; i < size; i++) {
		isNodeUpdated.push(false);
	}
	
	var node_index, new_node_index;
	for (var i = 0; i < maxIterations; i++) {
		console.log('begin iteration ' + i.toString());
		var meanColor = new Uint8Array(NUMBER_OF_USED_CHANNELS);
		var mean_dr, mean_dc, neighbor_count, mean_r, mean_c;
		for (var n = 0; n < size; n++ ) {
			isNodeUpdated[n] = false;
		}

		for (var r = 0; r < input.height; r++) {
			for (var c = 0; c < input.width; c++) {
				mean_r = r, mean_c = c;
				node_index = mean_r*width + mean_c;
				node_path[node_index] = node_index;
				
				while(true) {
					meanColor[0] = meanColor[1] = meanColor[2] = 0;
					mean_dr = 0; mean_dc = 0; neighbor_count = 0;

					
					var pixel = CV_IMAGE_ELEM(input, mean_r, mean_c);
					if (!isNodeUpdated[node_index]) {
						for (var dr = - radius; dr <= radius; dr++) {
							var neighbor_r = mean_r + dr;
							if (neighbor_r >= 0 && neighbor_r < input.height) {
								for (var dc = - radius; dc <= radius; dc++) {
									var neighbor_c = mean_c + dc;
									if (neighbor_c >= 0 && neighbor_c < input.width) {
										var neighbor_pixel = CV_IMAGE_ELEM(input, neighbor_r, neighbor_c);
										if (ColorDistance(pixel, neighbor_pixel) < COLOR_DIFF_FILTER_THRESHOLD) {
											//assign color to current pixel
											meanColor[0] += neighbor_pixel[0]; meanColor[1] += neighbor_pixel[1]; meanColor[2] += neighbor_pixel[2];
											mean_dr += dr;
											mean_dc += dc;
											neighbor_count++;
										}
									}
								}
							}
						}
						
						mean_dr = mean_dr*1.0/neighbor_count; mean_dc = mean_dc*1.0/neighbor_count;
						mean_r =  mean_r + mean_dr; mean_c = mean_c + mean_dc;
						meanColor[0] = meanColor[0]*1.0/neighbor_count; meanColor[1] = meanColor[1]*1.0/neighbor_count; meanColor[2] = meanColor[2]*1.0/neighbor_count;
						new_node_index = mean_r*width + mean_c;
						
						if (!isNewNodeVisited(node_path,node_index, new_node_index)) {
							node_path[new_node_index] = node_index;
							node_index = new_node_index;
						} else {
							updateNodePath(node_path, node_index, width, height, meanColor, output, isNodeUpdated);
							break;
						}
					} else {
						var updated_pixel = CV_IMAGE_ELEM(output, mean_r, mean_c);
						meanColor[0] = updated_pixel[0]; meanColor[1] = updated_pixel[1]; meanColor[2] = updated_pixel[2];
						//skip updated node
						updateNodePath(node_path, node_path[node_index], width, height, meanColor,output, isNodeUpdated);
						break;
					}
				}				
			}
		}

		copyData(output, input);
		console.log('end iteration ' + i.toString());
	}
	delete node_path;
	delete isNodeUpdated;
};


//TODO: 
function copyData(src, dst) {
	var length = src.width*src.height;
	for (var i = 0; i < length; i++) {
		dst.data[i] = src.data[i];
	}
}


function CV_IMAGE_ELEM(img, row, col) {
	//4 channels
	var pixels = new Uint8Array(NUMBER_OF_USED_CHANNELS);
	var first_index_of_pixel = (row*img.width + col)*NUMBER_OF_CHANNELS;
	pixels[0] = img.data[first_index_of_pixel];
	pixels[1] = img.data[first_index_of_pixel + 1];
	pixels[2] = img.data[first_index_of_pixel + 2];
	return pixels;
}

function ColorDistance( a,  b) {
	var d0 = Math.abs(a[0] - b[0])*1.0;
	var d1 = Math.abs(a[1] - b[1])*1.0;
	var d2 = Math.abs(a[2] - b[2])*1.0;
	return (d0 + d1 + d2)*1.0;
}

function updateNodePath(node_path, node_index, width, height, meanColor, output, isNodeUpdated) {
	var r,c;
	do {
		 r = node_index/width;
		 c = node_index - r*width;
		//Assign mean value to current pixel
		var output_pixel = CV_IMAGE_ELEM(output, r, c*NUMBER_OF_CHANNELS);
		output_pixel[0] = meanColor[0]; output_pixel[1] = meanColor[1]; output_pixel[2] = meanColor[2];
		isNodeUpdated[node_index] = true;
		node_index = node_path[node_index];
	} while (node_path[node_index] != node_index);
	
	//update root node
	r = node_index/width;
	c = node_index - r*width;
	var output_pixel = CV_IMAGE_ELEM(output, r, c*NUMBER_OF_CHANNELS);
	output_pixel[0] = meanColor[0]; output_pixel[1] = meanColor[1]; output_pixel[2] = meanColor[2];
	isNodeUpdated[node_index] = true;
}

function isNewNodeVisited(node_path, curr_node_index,  new_node_index) {
	do {
		if (curr_node_index == new_node_index) {
			return true;
		}
		curr_node_index = node_path[curr_node_index];
	} while(node_path[curr_node_index] != curr_node_index);

	if (curr_node_index == new_node_index) { //check root node
		return true;
	}

	return false;
}

function Segment( input) {
	var width = input.width;
	var height = input.height;
	var size = width*height;
	//Labels for each pixel
	console.log('Init label array with size ' + size.toString());
	var labels = new Int32Array(size);
	for (var i = 0; i < size; i++) {
		labels[i] = -1;
	}
	

	//Component (Union-Find Data Structure)
	var components = new Int32Array(size);
	for (var i = 0; i < size; i++) {
		//labels[i] = -1; //TODO: should use memset
		components[i] = i;
	}

	var componentCount = labelPixel(input, labels, components, width, height);
	//printf("raw component count %d\n", componentCount);
	var rootComponentCount = relabel(labels, components, componentCount, width, height);

	delete components;

	var labelComponent =  {
		count: rootComponentCount,
		labels: labels
	};
	
	
	return labelComponent;
}

function labelPixel(input, labels, components,  width,  height) {
	var componentCount = 0;
	var p_curr_pixel;
	var p_left_pixel;
	var p_top_pixel;
	var isLeftNeighbor, isTopNeighbor;
	var left_pixel_label, top_pixel_label;
	for (var r = 0; r < height; r++) {
		for (var c = 0; c < width; c++) {
			p_curr_pixel = CV_IMAGE_ELEM(input, r, c);

			var isIsolatedPixel = false;

			//check left and top pixels
			var labelIdx = r*width + c;
			if (r > 0 && c > 0) { 
				left_pixel_label = labels[r*width + c - 1];
				top_pixel_label = labels[(r - 1)*width + c];

				p_left_pixel = CV_IMAGE_ELEM(input, r, (c - 1));
				p_top_pixel = CV_IMAGE_ELEM(input, (r - 1), c);

				isLeftNeighbor = (ColorDistance(p_left_pixel, p_curr_pixel) < COLOR_DIFF_NEIGHBOR_THRESHOLD);
				isTopNeighbor =  (ColorDistance(p_top_pixel, p_curr_pixel) < COLOR_DIFF_NEIGHBOR_THRESHOLD);

				//Assign current pixel to smaller class, union two classes
				if (isLeftNeighbor && isTopNeighbor) { 
					labels[labelIdx] = Math.min(left_pixel_label, top_pixel_label);
					unionComponent(components, left_pixel_label, top_pixel_label);
				} else if (isLeftNeighbor) {
					labels[labelIdx] = left_pixel_label;
				} else if (isTopNeighbor) {
					labels[labelIdx] = top_pixel_label;
				} else {
					isIsolatedPixel = true;
				}
			} else if (c > 0) {

				left_pixel_label = labels[r*width + c - 1];
				p_left_pixel = CV_IMAGE_ELEM(input, r, (c - 1));
				isLeftNeighbor =  (ColorDistance(p_left_pixel, p_curr_pixel) < COLOR_DIFF_NEIGHBOR_THRESHOLD);

				if (isLeftNeighbor) {
					labels[labelIdx] = left_pixel_label;
				} else { 
					isIsolatedPixel = true;
				}

			} else if (r > 0) {
				top_pixel_label = labels[(r - 1)*width + c];
				p_top_pixel = CV_IMAGE_ELEM(input, (r - 1), c);
				isTopNeighbor = (ColorDistance(p_top_pixel, p_curr_pixel) < COLOR_DIFF_NEIGHBOR_THRESHOLD);

				if (isTopNeighbor) {
					labels[labelIdx] = top_pixel_label;
				} else {
					isIsolatedPixel = true;
				}
			} else {
				isIsolatedPixel = true;
			}

			if (isIsolatedPixel) { //Init a new component for isolated pixels
				labels[labelIdx] = componentCount;
				componentCount++;
			}
		}
	}

	return componentCount;
}

