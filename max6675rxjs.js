// import { Observable } from 'rxjs';
// import { map } from 'rxjs/operators';
// import { Gpio } from 'onoff';
const Observable = require('rxjs').Observable;
const map = require('rxjs/operators').map;
const Gpio = require('onoff').Gpio;


const isValidGpio = Symbol();
const initGpio = Symbol();
const readSO = Symbol();
const readTemp = Symbol();
const stop = Symbol();

class Max6675rxjs {
  constructor(cs, sck, so, interval = 1000) {
    if (cs && sck && so && typeof(interval) === 'number' && interval > 0 ) {
      	this[initGpio](cs, sck, so);
        this.interval = interval
    }

    process.on("SIGINT", () => this[stop]());
  }

  [stop]() {
		if (this.cs) {
			this.cs.writeSync(0);
			this.cs.unexport();
		}
		if (this.sck) {
			this.sck.writeSync(0);
			this.sck.unexport();
		}
		if (this.so) {
      this.so.writeSync(0);
			this.so.unexport();
    }
		process.exit();
	}

  // Init GPIO pin
  [initGpio](cs, sck, so) {
    if ( this[isValidGpio](cs) && this[isValidGpio](sck) && this[isValidGpio](so) && cs !== sck && cs!== so && sck !== so ) {
      this.cs = new Gpio(cs, 'out');
      this.sck = new Gpio(sck, 'out');
      this.so = new Gpio (so, 'in');

      this.sck.writeSync(0);
      this.cs.writeSync(1);

    } else {
      throw Error('Error during GPIO pin assignment!');
      process.exit(1);
    }
  }

  [isValidGpio](pin) {
    const validGpio = [2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27];
    return validGpio.indexOf(pin) > -1 ? true : false;
  }

  [readSO]() {
    let temp = 0;
    let termoCoupleOpenContact = false;

    // Enable reading from the serail output by putting CS to 'low' level
    this.cs.writeSync(0);

    // Skip dummy sign bit(15)
    this.sck.writeSync(1);
    this.sck.writeSync(0);

    // Read from bit(14) to bit(3)
    for(let i=11; i>=0; i--) {
      this.sck.writeSync(1);
      temp = temp + this.so.readSync() * Math.pow(2, i);
      this.sck.writeSync(0);
    }

    // Read bit(2) to check if termocouple is open
    this.sck.writeSync(1);
    termoCoupleOpenContact = this.so.readSync() ? true : false;
    this.sck.writeSync(0);

    // Disable reading from the serail output by putting CS to 'high' level
    this.cs.writeSync(1);

    // If termocouple is open drop exit with error
    if(termoCoupleOpenContact) {
      throw Error('Termocouple open! Check the termocouple wires');
      process.exit(1);
    }

    return temp;
  }

  [readTemp]() {
    return new Observable( observer => {
      setInterval(() => {
        observer.next(this[readSO]());
      }, this.interval);
    });
  }

  readTempC() {
    return this[readTemp]().pipe(
      map( temp => (temp * 0.25).toFixed(2) )
    );
  }

  readTempF() {
    return this[readTemp]().pipe(
      map( temp => (temp * 0.25 * 9 / 5 + 32).toFixed(2) )
    );
  }
};

module.exports.Max6675rxjs = Max6675rxjs;
