

function findConnectedComponent(data, width, widthStep,  height) {

	var size = width*height;
	//Labels for each pixel
	var labels = new Int32Array(size);
	memset(labels, -1, size);

	//Component (Union-Find Data Structure)
	var components = new Int32Array(size);
	for (var i = 0; i < size; i++) {
		//labels[i] = -1; //TODO: should use memset
		components[i] = i;
	}

	//1st pass
	var componentCount = label(data, labels, components, width, widthStep, height);
	var rootComponentCount = relabel(labels, components, componentCount, width, height);

	delete components;

	console.log(rootComponentCount);
	var labelComponent = {count: rootComponentCount,
						labels: labels};
	
	return labelComponent;
}

function relabel(labels, components, componentCount, width, height) {
	
	if (componentCount > 0) {
		var numberOfRootComponent = 0;
		var mapComponent = new Int32Array(componentCount);
		for (var i = 0; i < componentCount; i++) {
			if (components[i] == i) {
				mapComponent[i] = numberOfRootComponent;
				numberOfRootComponent++;
			}
		}

		for (var r = 0; r < height; r++) {
			for (var c = 0; c < width; c++) {
				var label_idx = r*width + c;
				var curr_label = labels[label_idx];
				if (curr_label >= 0) {
					var root_label = findRoot(components, curr_label);
					labels[label_idx] = mapComponent[root_label];
				}
			}
		}
		delete mapComponent;
		return numberOfRootComponent;
	} else {
		return 0;
	}

}

function findRoot( components, curr_comp) {
	var root_comp = curr_comp;
	while(components[root_comp] != root_comp) {
		root_comp = components[root_comp];
	}
	return root_comp;
}

function unionComponent(components, a, b) {
	if (a == b) return;

	var root_a = findRoot(components, a);
    var root_b = findRoot(components, b);

	if (root_a == root_b) return;

	if (root_a > root_b) {
		components[root_a] = root_b;
	} else {
		components[root_b] = root_a;
	}
}

function label(data, labels, components, width, widthStep,  height) {
	var componentCount = 0;
	var curr_pixel_value;
	var left_pixel_label, top_pixel_label;
	for (var r = 0; r < height; r++) {
		for (var c = 0; c < width; c++) {
			curr_pixel_value = data[r*widthStep + c];
			if (isForeGroundPixel(curr_pixel_value)) {//check if current pixel is foreground pixel or not
				var isIsolatedPixel = false;

				//check left and top pixels
				var labelIdx = r*width + c;
				if (r > 0 && c > 0) { 
					left_pixel_label = labels[r*width + c - 1];
					top_pixel_label = labels[(r - 1)*width + c];

					//Assign current pixel to smaller class, union two classes
					if (left_pixel_label >= 0 && top_pixel_label >= 0) { 
						labels[labelIdx] = min(left_pixel_label, top_pixel_label);
						unionComponent(components, left_pixel_label, top_pixel_label);
					} else if (left_pixel_label >= 0) {
						labels[labelIdx] = left_pixel_label;
					} else if (top_pixel_label >= 0) {
						labels[labelIdx] = top_pixel_label;
					} else {
						isIsolatedPixel = true;
					}

				} else if (c > 0) {
					left_pixel_label = labels[r*width + c - 1];
					if (left_pixel_label >= 0) {
						labels[labelIdx] = left_pixel_label;
					} else { 
						isIsolatedPixel = true;
					}

				} else if (r > 0) {
					top_pixel_label = labels[(r - 1)*width + c];
					if (top_pixel_label >= 0) {
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
	}

	return componentCount;
}

function isForeGroundPixel(pixel_value) {
	if (pixel_value > 0)
        return true;
    else 
        return false;
}