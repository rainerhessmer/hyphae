// Inspired by and heavily borrowed from http://inconvergent.net/generative/hyphae/
// 2018, Dr. Rainer Hessmer
// Licensed under the MIT license.

var canvas = document.getElementById('canvas');

var simulation;
var isPaused = false;

var smallestRadius = Number.MAX_VALUE;

// Standard Normal variate using Box-Muller transform.
function normal() {
    var u = 0, v = 0;
    while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
    while(v === 0) v = Math.random();
    return Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
}

function resizeCanvas() {
  var resizeFactor = 1;
  canvas.width = resizeFactor * window.innerWidth - 50;
  canvas.height = resizeFactor * window.innerHeight - 50;

  isPaused = false;

  simulation = new Simulation(canvas);
  simulation.init();
}

function calcDistance(point1, point2) {
  var dx = point1.x - point2.x;
  var dy = point1.y - point2.y
  return Math.sqrt(dx * dx + dy * dy);
}

class Simulation {
  static get INIT_PARTICLE_COUNT() { return 3; }
  static get INIT_CIRCLE_RATIO() { return 0.45; }
  static get OUTER_CIRCLE_RATIO() { return 0.95; }
  static get CREATE_PARTICLE_ATTEMPTS_PER_STEP() { return 1000; }
  // static get MAX_PARTICLE_COUNT() { return 200000; }

  constructor(canvas) {
    this.canvas = canvas;

    this.ctx = canvas.getContext('2d');

    //this.maxParticles = 100000;
    this.initCircleRadius = Simulation.INIT_CIRCLE_RATIO *
        0.5 * Math.min(canvas.width, canvas.height);

    //this.branchCountLimit = 15;

    this.center = {
      x: 0.5 * canvas.width,
      y: 0.5 * canvas.height
    }
    this.outerRadius = 0.5 * Simulation.OUTER_CIRCLE_RATIO *
        Math.min(canvas.width, canvas.height);

    this.particles = [];
    this.zonesNN = new ZonesNN(
        canvas.width, canvas.height,
        Particle.INITIAL_RADIUS,
        Particle.DISTANCE_FN);
    this.iteration = 0;
  }
  init() {
    // Fill to create background.
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this._initParticles();
  }
  _initParticles() {
    // number of initial nodes
    var i = 0;

    // initialize source nodes
    while (i < Simulation.INIT_PARTICLE_COUNT) {
      // in circle
      var particleCenter = {
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height
      };
      if (calcDistance(particleCenter, this.center) > this.initCircleRadius) {
        // try again
        continue;
      }

      var particle = new Particle(particleCenter, /*parent=*/ null);
      this._addParticle(particle);

      i += 1;
    }
  }
  _addParticle(particle) {
    this.particles.push(particle);
    this.zonesNN.insert(particle);
    particle.draw(this.ctx);
  }
  step() {
    var newParticleCount = 0;
    var attempts = 0;
    //while (newParticleCount < 10) {
    while (attempts < Simulation.CREATE_PARTICLE_ATTEMPTS_PER_STEP) {
      attempts++;
      this.iteration++;

      // Select a random particle
      var k = Math.floor(Math.random() * this.particles.length);
      var particle = this.particles[k];

      // Potentially create a new particle.
      var newParticle = particle.createDescendant(this.zonesNN);
      if (newParticle != null) {
        this._addParticle(newParticle);
        //alert("new particle");
        newParticleCount++;
        if (newParticleCount > 10) {
          return newParticleCount;
        }
      }
    }
    // console.log('lastNewParticleCount: ' + lastNewParticleCount);
    // console.log('totalParticleCount: ' + this.particles.length);

    return newParticleCount;
  }
};

class Particle {
  static get COLOR() { return '#000000'; }
  static get INITIAL_RADIUS() { return 8; }
  static get MAX_BRANCH_ATTEMPTS() { return 5; }
  static get SEGMENT_LENGTH_SCALE() { return 0.92; }
  static get MAX_SEARCH_ANGLE() { return 0.8 * Math.PI; }
  static get RADIUS_RATIO() { return 0.39; }
  static get MIN_REQUIRED_SEPARATION() { return 1.0; }
  static get DISTANCE_FN() {
    return function(newParticle, existingParticle) {
      var centerDistance = calcDistance(newParticle, existingParticle);
      // console.log('newParticle.radius: ' + newParticle.radius);
      // console.log('existingParticle.radius: ' + existingParticle.radius);
      // console.log('adj: ' + (newParticle.radius + existingParticle.radius));
      return centerDistance - (newParticle.radius + existingParticle.radius);
    };
 }

  constructor(center, parent) {
    this.x = center.x;
    this.y = center.y;
    this.parent = parent;

    if (parent == null) {
      this.radius = Particle.INITIAL_RADIUS;
      this.theta = Math.random() * 2 * Math.PI;

      this.branchAttempts = 0;
      this.generation = 1;
      this.descendant = null;
    }
  }
  createDescendant(zonesNN) {
    this.branchAttempts++;
    if (this.branchAttempts > Particle.MAX_BRANCH_ATTEMPTS) {
      // The branch is dead.
      // console.log('branch is dead');
      return null;
    }

    var radius = this.descendant != null ?
       this.radius * Particle.SEGMENT_LENGTH_SCALE
       : this.radius;
    var drawingRadius = radius * Particle.RADIUS_RATIO;
    if (drawingRadius < 0.5) {
      // Smaller than a pixel; the branch dies.
      this.branchAttempts = Particle.MAX_BRANCH_ATTEMPTS + 1;
      console.log('getting too small');
      return null;
    }

    var generation = this.descendant != null ?
        this.generation + 1 : this.generation;
    var value = normal();
    // console.log(value);
    var theta = this.theta +
        (1. - 1. / Math.pow(generation + 1.0, 0.1)) * value
        * Particle.MAX_SEARCH_ANGLE;

    var center = {
      x: this.x + (this.radius + radius) * Math.sin(theta),
      y: this.y + (this.radius + radius) * Math.cos(theta)
    };

    //console.log('distance from parent = ' + calcDistance(center, this));

    // stop nodes at edge of circle
    if (calcDistance(center, simulation.center) > simulation.outerRadius) {
      //console.log('outdside of outer radius');
      return null;
    }

    //var maxDistance = radius + Particle.INITIAL_RADIUS
    //   + Particle.MIN_REQUIRED_DISTANCE;

    // Candidate particle
    var newParticle = new Particle(center, this);
    newParticle.radius = radius;

    var nearestParticleInfo = zonesNN.nearestTo(newParticle, [this, this.parent]);
    if (nearestParticleInfo == null
        || nearestParticleInfo.distance > 0) { // >= -1/Particle.RADIUS_RATIO) {

      if (nearestParticleInfo != null) {
        // console.log('nearestParticleInfo.distance: ' + nearestParticleInfo.distance);
        newParticle.nearest = nearestParticleInfo.particle;
      } else {
        newParticle.nearest = null;
      }
      //console.log('new particle');

      // The candidate particle got accepted.
      newParticle.theta = theta;
      newParticle.generation = generation;

      if (this.descendant == null) {
        // Set first descendent.
        this.descendant = newParticle;
      }
      return newParticle;
    } else {
      // console.log('too close');
      return null;
    }
  }
  draw(ctx) {
    // this.drawCircle(ctx);
    // this.drawWithConnections(ctx);
    this.drawConnected(ctx);
  }
  drawCircle(ctx) {
    ctx.beginPath();
    ctx.arc(
        this.x,
        this.y,
        this.radius * Particle.RADIUS_RATIO, 0, 2 * Math.PI, false);
    ctx.lineWidth = 1;
    ctx.strokeStyle = Particle.COLOR;
    ctx.stroke();
  }
  drawFilledCircle(ctx) {
    ctx.beginPath();
    ctx.arc(
      this.x,
      this.y,
      this.radius * Particle.RADIUS_RATIO, 0, 2 * Math.PI, false);
    ctx.fillStyle = Particle.COLOR;
    ctx.fill();
  }
  drawConnected(ctx) {
    this.drawFilledCircle(ctx);
    if (this.parent == null) {
      return;
    }

    ctx.beginPath();
    ctx.moveTo(this.parent.x, this.parent.y);

    var drawingRadius = this.radius * Particle.RADIUS_RATIO;
    if (drawingRadius < smallestRadius ) {
      smallestRadius = drawingRadius;
      console.log('smallest drawingRadius: ' + smallestRadius);
    }
    ctx.lineWidth = 2.0 * this.radius * Particle.RADIUS_RATIO;
    //ctx.lineCap = 'round';
    ctx.strokeStyle = Particle.COLOR;
    ctx.lineTo(this.x, this.y);
    ctx.stroke();
  }
  drawConnected2(ctx) {
    if (this.parent == null) {
      return;
    }
    ctx.beginPath();
    ctx.moveTo(this.parent.x, this.parent.y);

    var drawingRadius = this.radius * Particle.RADIUS_RATIO;
    if (drawingRadius < smallestRadius ) {
      smallestRadius = drawingRadius;
      console.log('smallest drawingRadius: ' + smallestRadius);
    }
    ctx.lineWidth = this.radius * 2 * Particle.RADIUS_RATIO;
    ctx.lineCap = 'round';
    ctx.strokeStyle = Particle.COLOR;
    ctx.lineTo(this.x, this.y);
    ctx.stroke();
  }
  drawWithConnections(ctx) {
    this.drawFilledCircle(ctx);
    this.drawConnectionToParent(ctx);
    // this.drawConnectionToNearest(ctx);
  }
  drawConnectionToParent(ctx) {
    if (this.parent == null) {
      return;
    }
    ctx.beginPath();
    ctx.moveTo(this.parent.x, this.parent.y);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'red';
    ctx.lineTo(this.x, this.y);
    ctx.stroke();
  }
  drawConnectionToNearest(ctx) {
    if (this.nearest == null) {
      return;
    }
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'black';
    ctx.lineTo(this.nearest.x, this.nearest.y);
    ctx.stroke();
  }
};

// Helper class used to find closest particles. Particles are collected by zones
// ('buckets' in 2d). To find particles in the vicinity only the closest zones
// need to be searched.
class ZonesNN {
  constructor(width, height, maxParticleSize, distanceFn) {
    this.zoneSize = 2 * maxParticleSize;

    // We add to the count to allow for empty zones surrounding the field.
    this.xLength = 2 + Math.floor(width / maxParticleSize);
    this.yLength = 2 + Math.floor(height / maxParticleSize);

    var zones = new Array(this.xLength * this.yLength);
    for (var i = 0; i < zones.length; i++) {
      zones[i] = [];
    }
    this.zones = zones;
    this.distanceFn = distanceFn;
  }
  insert(particle) {
    var zoneIndex = this._getZoneIndex(particle);
    this.zones[zoneIndex].push(particle);
  }
  nearestTo(particle, excludedParticles) {
    // We search the zone that new Particle is in as well as the eight
    // surounding cells.
    var centerIndex = this._getZoneIndex(particle);
    var aboveIndex = centerIndex - this.yLength;
    var belowIndex = centerIndex + this.yLength;
    var indexesToSearch = [
        aboveIndex - 1, aboveIndex, aboveIndex + 1,
        centerIndex - 1, centerIndex, centerIndex + 1,
        belowIndex - 1, belowIndex, belowIndex + 1
      ];
    var nearestInfo = null;
    for (var i = 0; i < indexesToSearch.length; i++) {
      nearestInfo = this._nearestToInZone(
          particle, excludedParticles, indexesToSearch[i], nearestInfo);
    }
    return nearestInfo;
  }
  _nearestToInZone(particle, excludedParticles, zoneIndex, soFarNearestInfo) {
    var particlesInZone = this.zones[zoneIndex];
    var nearestParticle;
    var nearestDistance;
    if (soFarNearestInfo == null) {
      nearestDistance = Number.MAX_VALUE;
    } else {
      nearestParticle = soFarNearestInfo.particle;
      nearestDistance = soFarNearestInfo.distance;
    }

    for (var i = 0; i < particlesInZone.length; i++) {
      var particleInZone = particlesInZone[i];
      if (excludedParticles.includes(particleInZone)) {
        continue;
      }

      var distance = this.distanceFn(particle, particleInZone);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestParticle = particleInZone;
      }
    }

    if (nearestParticle === undefined) {
      return null;
    } else {
      return {
        particle: nearestParticle,
        distance: nearestDistance
      }
    }
  }
  _getZoneIndex(particle) {
    var xIndex = 1 + Math.floor(particle.x / this.zoneSize);
    var yIndex = 1 + Math.floor(particle.y / this.zoneSize);

    var zoneIndex = xIndex * this.yLength + yIndex;
    /*
    if (zoneIndex >= this.zones.length) {
      console.log('particle.x: ' + particle.x + '; canvas.width: ' + canvas.width);
      console.log('particle.y: ' + particle.y + '; canvas.height: ' + canvas.height);

      console.log('xIndex: ' + xIndex + '; xLength: ' + this.xLength);
      console.log('yIndex: ' + yIndex + '; yLength: ' + this.yLength);

      console.log('zone index: ' + zoneIndex + ', zones length: ' + this.zones.length);
    }
    */
    return zoneIndex;
  }
}

function drawFrame() {
  if (!isPaused /*&& lastNewParticleCount != 0*/) {
    lastNewParticleCount = simulation.step();
  }
  window.setTimeout(drawFrame, 1);
};

var lastNewParticleCount = -1;
function onNewFrame() {
  if (!isPaused /*&& lastNewParticleCount != 0*/) {
    lastNewParticleCount = simulation.step();
  }
  requestAnimationFrame(onNewFrame);
}

//window.addEventListener('resize', resizeCanvas, false);

window.onkeydown = function(evt) {
    evt = evt || window.event;
    if (evt.key == " ") {
      // toggle isPaused
      isPaused = !isPaused;
    }
};

resizeCanvas();
requestAnimationFrame(onNewFrame);
//drawFrame();
