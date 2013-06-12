/**
 * Creates a signature like visual representation of
 * a binary key/signature/fingerprint on an html5 canvas.
 *
 * KeyVis.draw(canvas [, decoder]);
 */
var KeyVis = new function() {
	// what function to use to decode the data-key into a binary string
	var defaultDecoder = window.atob;
	// how quickly the color changes through the line
	var colorChangeSpeed = .1;
	// padding to leave around the points of the signature for the curves
	var padding = 20;

	/**
	 * @param float x A float which uses a 0-1 cycle for hue
	 * @return string an rbg string
	 */
	function getRgb(x) {
		// make sure x is in the 0-1 range
		if(x > 1 || x < 0) {
			x = x - Math.floor(x);
		}
		var c = [
			-1+2*Math.abs(1.5-3*x),
			2-2*Math.abs(1-3*x),
			2-2*Math.abs(2-3*x)
		];
		for(var i in c) {
			c[i] = Math.floor(.6*255*Math.max(Math.min(c[i], 1),0));
		}
		return 'rgb('
			+c[0]+','
			+c[1]+','
			+c[2]+')'
		;
	}

	/**
	 * Pulls out 4 bit sets from a binary string
	 */
	function getHexits(data, index, bytes) {
		var hexits = [];
		var b;
		for(var i = index; i < index+bytes; i++) {
			b = data.charCodeAt(i);
			hexits.push(b & 15);
			hexits.push(b >>> 4);
		}
		return hexits;
	}

	/**
	 * Determine point data from 32 bits
	 */
	function getPoint(data, index, x,y, width,height) {
		var hexits = getHexits(data, index*2, 2);

		var theta = 2*Math.PI * (hexits[0] & 7) / 8.0;
		var mag = .5 + .5*(hexits[1]) / 16.0;

		// calculate relative point
		var pt = {
			bounce: (hexits[0] >>> 3) ? 1 : -1,
			x: (hexits[2] >>> 2) / 3.0,
			y: (1-(hexits[2] & 3)) / 2.0,
			dx: mag * Math.sin(theta),
			dy: mag * Math.cos(theta),
			dColor: hexits[3]/15.0 - 0.5,
		};

		// calculate absolute point
		pt.x = x + pt.x * width;
		pt.y = y + pt.y * height;
		pt.dx = 2*width * pt.dx;
		pt.dy = height * pt.dy;
		return pt;
	}

	/**
	 * Summarizes the data into 1 byte for some overall features
	 */
	function getSummaryByte(data) {
		var b = 0;
		for(var i=0; i<data.length; i++) {
			b ^= data.charCodeAt(i);
		}
		return b;
	}

	/**
	 * @param canvas The canvas with a "data-key" attribute
	 * @param decoder (optional) The function to decode data-key into a binary string (default atob)
	 */
	this.drawOn = function(canvas, decoder) {
		var key = canvas.getAttribute('data-key');
		console.info("drawing: "+key);
		if(!decoder)
			decoder = defaultDecoder;

		// get binary from base64
		key = decoder(key);
		console.info("The key is "+key.length*8+" bits long");

		// cut off the public key type?
		//key = key.substring(12);

		if (canvas.getContext){
			var ctx = canvas.getContext('2d');
			//ctx.fillStyle='black';
			//ctx.fillRect(0,0,canvas.width,canvas.height);

			var width = (canvas.width - 2*padding) / (key.length/4);
			var height = (canvas.height - 2*padding) * .50;

			var x;
			var xReturn = .8;
			var y = canvas.height - padding - height/2;

			var dataSummary = getSummaryByte(key);
			var colorValue = dataSummary/255.0;

			var pt, p2;
			for(var i=0; i < key.length/4; i++) {
				x = (i)*width + padding;

				// get point 1
				p1 = getPoint(key, 2*i, x,y, width,height);

				// gradually adjust the color
				colorValue = colorValue + colorChangeSpeed*p1.dColor;
				ctx.strokeStyle = getRgb(colorValue);

				// draw from the baseline to point 1
				ctx.beginPath();
				ctx.moveTo(x, y);
				ctx.bezierCurveTo(
					x + xReturn*width, y,
					p1.x + p1.dx, p1.y + p1.dy,
					p1.x, p1.y
				);
				ctx.stroke();

				// get point 2
				p2 = getPoint(key, 2*i+1, x,y, width,height);

				// gradually adjust the color
				colorValue = colorValue + colorChangeSpeed*p2.dColor;
				ctx.strokeStyle = getRgb(colorValue);

				// draw to point 2
				ctx.beginPath();
				ctx.moveTo(p1.x, p1.y);
				ctx.bezierCurveTo(
					p1.x + p1.bounce*p1.dx, p1.y + p1.bounce*p1.dy,
					p2.x + p2.dx, p2.y + p2.dy,
					p2.x, p2.y
				);
				ctx.stroke();

				// draw back to the baseline
				x = (i+1)*width + padding;
				ctx.beginPath();
				ctx.moveTo(p2.x, p2.y);
				ctx.bezierCurveTo(
					p2.x + p2.bounce*p2.dx, p2.y + p2.bounce*p2.dy,
					x - xReturn*width, y,
					x, y
				);
				ctx.stroke();
			}
		}
	};
}();

