/*
Note that if your data is too large, there _will_ be overflow.
*/


function asc(a, b) { return a-b; }

var config_params = {
	bucket_precision: function(o, s) {
		if(typeof s != "number" || s <= 0) {
			throw "bucket_precision must be a positive number";
		}
		o._config.bucket_precision = s;
		o.buckets = [];
	},

	buckets: function(o, b) {
		if(!Array.isArray(b) || b.length == 0) {
			throw "buckets must be an array of bucket limits";
		}

		o._config.buckets = b;
		o.buckets = [];
	},

	bucket_extension_interval: function(o, s) {
		if(typeof s != "number" || s<=0) {
			throw "bucket_extension_interval must be a positive number";
		}
		o._config.bucket_extension_interval = s;
	},

	store_data: function(o, s) {
		if(typeof s != "boolean") {
			throw "store_data must be a true or false";
		}
		o._config.store_data = s;
	}
};

function Stats(c) {
	this.reset();

	this._config = { store_data:  true };

	if(c) {
		for(var k in config_params) {
			if(c.hasOwnProperty(k)) {
				config_params[k](this, c[k]);
			}
		}
	}

	return this;
}

Stats.prototype = {

	reset: function() {
		this.data = [];
		this.length = 0;
	
		this.sum = 0;
		this.sum_of_squares = 0;
		this.sum_of_logs = 0;
		this.sum_of_square_of_logs = 0;
		this.max = this.min = null;
	
		this._reset_cache();

		return this;
	},

	_reset_cache: function() {
		this._stddev = null;
		this._data_sorted = null;
	},

	_find_bucket: function(a) {
		var b=0, e, l = this._config.buckets.length;
		if(this._config.buckets) {
			if(this._config.bucket_extension_interval && a >= this._config.buckets[l-1]) {
				e=a-this._config.buckets[l-1];
				b = parseInt(e/this._config.bucket_extension_interval) + l;
				if(this._config.buckets[b] === undefined)
					this._config.buckets[b] = this._config.buckets[l-1] + (parseInt(e/this._config.bucket_extension_interval)+1)*this._config.bucket_extension_interval;
				if(this._config.buckets[b-1] === undefined)
					this._config.buckets[b-1] = this._config.buckets[l-1] + parseInt(e/this._config.bucket_extension_interval)*this._config.bucket_extension_interval;
			}
			for(; b<l; b++) {
				if(a < this._config.buckets[b]) {
					break;
				}
			}
		}
		else if(this._config.bucket_precision) {
			b = Math.floor(a/this._config.bucket_precision);
		}

		return b;
	},

	_add_cache: function(a) {
		this.sum += a;
		this.sum_of_squares += a*a;
		this.sum_of_logs += Math.log(a);
		this.sum_of_square_of_logs += Math.pow(Math.log(a), 2);
		this.length++;

		if(this.max === null || this.max < a)
			this.max = a;
		if(this.min === null || this.min > a)
			this.min = a;

		if(this.buckets) {
			var b = this._find_bucket(a);
			this.buckets[b] = (this.buckets[b] || 0) + 1;
		}

		this._reset_cache();
	},

	_del_cache: function(a) {
		this.sum -= a;
		this.sum_of_squares -= a*a;
		this.sum_of_logs -= Math.log(a);
		this.sum_of_square_of_logs -= Math.pow(Math.log(a), 2);
		this.length--;

		if(this.length === 0) {
			this.max = this.min = null;
		}
		else if(this.max === a || this.min === a) {
			var i = this.length-1;
			this.max = this.min = this.data[i--];
			while(i--) {
				if(this.max < this.data[i])
					this.max = this.data[i];
				if(this.min > this.data[i])
					this.min = this.data[i];
			}
		}

		if(this.buckets) {
			var b=this._find_bucket(a);
			this.buckets[b]--;
			if(this.buckets[b] === 0)
				delete this.buckets[b];
		}

		this._reset_cache();
	},

	push: function() {
		var i, a, args=Array.prototype.slice.call(arguments, 0);
		if(args.length && args[0] instanceof Array)
			args = args[0];
		for(i=0; i<args.length; i++) {
			a = args[i];
			if(this._config.store_data)
				this.data.push(a);
			this._add_cache(a);
		}

		return this;
	},

	pop: function() {
		if(this.length === 0 || this._config.store_data === false)
			return undefined;

		var a = this.data.pop();
		this._del_cache(a);

		return a;
	},

	unshift: function() {
		var i, a, args=Array.prototype.slice.call(arguments, 0);
		if(args.length && args[0] instanceof Array)
			args = args[0];
		i=args.length;
		while(i--) {
			a = args[i];
			if(this._config.store_data)
				this.data.unshift(a);
			this._add_cache(a);
		}

		return this;
	},

	shift: function() {
		if(this.length === 0 || this._config.store_data === false)
			return undefined;

		var a = this.data.shift();
		this._del_cache(a);

		return a;
	},

	amean: function() {
		if(this.length === 0)
			return NaN;
		return this.sum/this.length;
	},

	gmean: function() {
		if(this.length === 0)
			return NaN;
		return Math.exp(this.sum_of_logs/this.length);
	},

	stddev: function() {
		if(this.length === 0)
			return NaN;
		if(this._stddev === null)
			this._stddev = Math.sqrt(this.length * this.sum_of_squares - this.sum*this.sum)/this.length;

		return this._stddev;
	},

	gstddev: function() {
		if(this.length === 0)
			return NaN;
		return Math.exp(Math.sqrt(this.length * this.sum_of_square_of_logs - this.sum_of_logs*this.sum_of_logs)/this.length);
	},

	moe: function() {
		if(this.length === 0)
			return NaN;
		// see http://en.wikipedia.org/wiki/Standard_error_%28statistics%29
		return 1.96*this.stddev()/Math.sqrt(this.length);
	},

	range: function() {
		if(this.length === 0)
			return [NaN, NaN];
		return [this.min, this.max];
	},

	distribution: function() {
		if(this.length === 0)
			return [];
		if(!this.buckets)
			throw "bucket_precision or buckets not configured.";

		var d=[], j, i, l;

		if(this._config.buckets) {
			j=this.min;
			l=Math.min(this.buckets.length, this._config.buckets.length);

			for(i=0; i<l; j=this._config.buckets[i++]) {	// this has to be i++ and not ++i
				if(this._config.buckets[i] === undefined && this._config.bucket_extension_interval)
					this._config.buckets[i] = this._config.buckets[i-1] + this._config.bucket_extension_interval;
				if(this.min > this._config.buckets[i])
					continue;

				d[i] = {
					bucket: (j+this._config.buckets[i])/2,
					range: [j, this._config.buckets[i]],
					count: (this.buckets[i]|0)
				};

				if(this.max < this._config.buckets[i])
					break;
			}
			if(i == l && this.buckets[i])
				d[i] = {
					bucket: (j + this.max)/2,
					range: [j, this.max],
					count: this.buckets[i]
				};
		}
		else if(this._config.bucket_precision) {
			i=Math.floor(this.min/this._config.bucket_precision);
			l=Math.floor(this.max/this._config.bucket_precision)+1;
			for(j=0; i<l && i<this.buckets.length; i++, j++) {
				if(this.buckets[i])
					d[j] = {
						bucket: (i+0.5)*this._config.bucket_precision,
						range: [i*this._config.bucket_precision, (i+1)*this._config.bucket_precision],
						count: this.buckets[i]
					};
			}
		}

		return d;
		
	},

	percentile: function(p) {
		if(this.length === 0 || (!this._config.store_data && !this.buckets))
			return NaN;

		// If we come here, we either have sorted data or sorted buckets

		var v;

		if(p <=  0)
			v=0;
		else if(p == 25)
			v = [Math.floor((this.length-1)*0.25), Math.ceil((this.length-1)*0.25)];
		else if(p == 50)
			v = [Math.floor((this.length-1)*0.5), Math.ceil((this.length-1)*0.5)];
		else if(p == 75)
			v = [Math.floor((this.length-1)*0.75), Math.ceil((this.length-1)*0.75)];
		else if(p >= 100)
			v = this.length-1;
		else
			v = Math.floor(this.length*p/100);

		if(v === 0)
			return this.min;
		if(v === this.length-1)
			return this.max;

		if(this._config.store_data) {
			if(this._data_sorted === null)
				this._data_sorted = this.data.slice(0).sort(asc);

			if(typeof v == 'number')
				return this._data_sorted[v];
			else
				return (this._data_sorted[v[0]] + this._data_sorted[v[1]])/2;
		}
		else {
			var j;
			if(typeof v != 'number')
				v = (v[0]+v[1])/2;

			if(this._config.buckets)
				j=0;
			else if(this._config.bucket_precision)
				j = Math.floor(this.min/this._config.bucket_precision);

			for(; j<this.buckets.length; j++) {
				if(!this.buckets[j])
					continue;
				if(v<this.buckets[j]) {
					break;
				}
				v-=this.buckets[j];
			}

			return this._get_nth_in_bucket(v, j);
		}
	},

	_get_nth_in_bucket: function(n, b) {
		var range = [];
		if(this._config.buckets) {
			range[0] = (b>0?this._config.buckets[b-1]:this.min);
			range[1] = (b<this._config.buckets.length?this._config.buckets[b]:this.max);
		}
		else if(this._config.bucket_precision) {
			range[0] = b*this._config.bucket_precision;
			range[1] = (b+1)*this._config.bucket_precision;
		}
		return range[0] + (range[1] - range[0])*n/this.buckets[b];
	},

	median: function() {
		return this.percentile(50);
	},

	iqr: function() {
		var q1, q3, fw;

		q1 = this.percentile(25);
		q3 = this.percentile(75);
	
		fw = (q3-q1)*1.5;
	
		return this.band_pass(q1-fw, q3+fw, true);
	},

	band_pass: function(low, high, open, config) {
		var i, j, b, b_val, i_val;

		if(!config)
			config = this._config;

		b = new Stats(config);

		if(this.length === 0)
			return b;

		if(this._config.store_data) {
			if(this._data_sorted === null)
				this._data_sorted = this.data.slice(0).sort(asc);
	
			for(i=0; i<this.length && (this._data_sorted[i] < high || (!open && this._data_sorted[i] === high)); i++) {
				if(this._data_sorted[i] > low || (!open && this._data_sorted[i] === low)) {
					b.push(this._data_sorted[i]);
				}
			}
		}
		else if(this._config.buckets) {
			for(i=0; i<=this._config.buckets.length; i++) {
				if(this._config.buckets[i] < this.min)
					continue;

				b_val = (i==0?this.min:this._config.buckets[i-1]);
				if(b_val < this.min)
					b_val = this.min;
				if(b_val > this.max)
					b_val = this.max;

				if(high < b_val || (open && high === b_val)) {
					break;
				}
				if(low < b_val || (!open && low === b_val)) {
					for(j=0; j<(this.buckets[i]|0); j++) {
						i_val = this._get_nth_in_bucket(j, i);
						if( (i_val > low || (!open && i_val === low))
							&& (i_val < high || (!open && i_val === high))
						) {
							b.push(i_val);
						}
					}
				}
			}

			b.min = Math.max(low, b.min);
			b.max = Math.min(high, b.max);
		}
		else if(this._config.bucket_precision) {
			low = Math.floor(low/this._config.bucket_precision);
			high = Math.floor(high/this._config.bucket_precision)+1;

			for(i=low; i<Math.min(this.buckets.length, high); i++) {
				for(j=0; j<(this.buckets[i]|0); j++)
					b.push((i+0.5)*this._config.bucket_precision);
			}

			b.min = Math.max(low, b.min);
			b.max = Math.min(high, b.max);
		}

		return b;
	},

	copy: function(config) {
		var b = Stats.prototype.band_pass.call(this, this.min, this.max, false, config);

		b.sum = this.sum;
		b.sum_of_squares = this.sum_of_squares;
		b.sum_of_logs = this.sum_of_logs;
		b.sum_of_square_of_logs = this.sum_of_square_of_logs;

		return b;
	},

	Σ: function() {
		return this.sum;
	},

	Π: function() {
		return Math.exp(this.sum_of_logs);
	}
};

Stats.prototype.σ=Stats.prototype.stddev;
Stats.prototype.μ=Stats.prototype.amean;


exports.Stats = Stats;

if(process.argv[1] && process.argv[1].match(__filename)) {
	var s = new Stats({store_data:false, buckets: [ 1, 5, 10, 15, 20, 25, 30, 35 ]}).push(1, 2, 3);
	var l = process.argv.slice(2);
	if(!l.length) l = [10, 11, 15, 8, 13, 12, 19, 32, 17, 16];
	l.forEach(function(e, i, a) { a[i] = parseFloat(e, 10); });
	Stats.prototype.push.apply(s, l);
	console.log(s.data);
	console.log(s.amean().toFixed(2), s.μ().toFixed(2), s.stddev().toFixed(2), s.σ().toFixed(2), s.gmean().toFixed(2), s.median().toFixed(2), s.moe().toFixed(2), s.distribution());
	var t=s.copy({buckets: [0, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 25, 30, 35] });
	console.log(t.amean().toFixed(2), t.μ().toFixed(2), t.stddev().toFixed(2), t.σ().toFixed(2), t.gmean().toFixed(2), t.median().toFixed(2), t.moe().toFixed(2), t.distribution());
}
