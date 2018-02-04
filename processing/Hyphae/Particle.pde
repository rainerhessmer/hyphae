 int particleIndex = 0;

class Particle {
  final static color COLOR = #000000;
  final static float INITIAL_RADIUS = 80;
  final static int MAX_BRANCH_ATTEMPTS = 30;
  final static float SEGMENT_LENGTH_SCALE = 0.9; //0.92;
  final static float MAX_SEARCH_ANGLE = 1.0 * (float)Math.PI;
  final static float RADIUS_RATIO = 0.39;
  
  private PVector center;
  private Particle parent;
  private int index;
  private float radius;
  private float theta;
  private int branchAttempts;
  private int generation;
  private Particle descendant;
  private Particle nearest;

  Particle(PVector center, Particle parent) {
    this.center = center;
    this.parent = parent;
    this.index = particleIndex++; 

    if (parent == null) {
      this.radius = INITIAL_RADIUS;
      this.theta = random(1) * 2 * (float)Math.PI;

      this.branchAttempts = 0;
      this.generation = 1;
      this.descendant = null;
    }
  }
  
  float distance(Particle other) {
    float centerDistance = this.center.dist(other.center);  
    //println(centerDistance);
    return centerDistance - this.radius - other.radius;
  } //<>//
  
  Particle createDescendant(Simulation simulation, ZonesNN zonesNN) {
    branchAttempts++;
    if (branchAttempts > MAX_BRANCH_ATTEMPTS) {
      // The branch is dead.
      // console.log('branch is dead');
      return null;
    }

    float newRadius = this.descendant != null ?
       this.radius * SEGMENT_LENGTH_SCALE
       : this.radius;
    float drawingRadius = newRadius * RADIUS_RATIO;
    if (drawingRadius < 0.5) {
      // Smaller than a pixel; the branch dies.
      branchAttempts = MAX_BRANCH_ATTEMPTS + 1;
      //console.log('getting too small');
      return null;
    }
    
    int newGeneration = this.descendant != null ?
        this.generation + 1 : this.generation;
    float value = (float)normal();
    // console.log(value);
    float newTheta = this.theta +
        (1. - 1. / (float)Math.pow(newGeneration + 1.0, 0.1)) * value
        * MAX_SEARCH_ANGLE;

    PVector newCenter = new PVector(
      this.center.x + (this.radius + newRadius) * (float)Math.sin(newTheta),
      this.center.y + (this.radius + newRadius) * (float)Math.cos(newTheta)
    );

    //console.log('distance from parent = ' + calcDistance(center, this));

    // stop nodes at edge of circle
    if (newCenter.dist(simulation.center) > simulation.outerCircleRadius) {
      //console.log('outdside of outer radius');
      return null;
    }

    //var maxDistance = radius + Particle.INITIAL_RADIUS
    //   + Particle.MIN_REQUIRED_DISTANCE;

    // Candidate particle
    Particle newParticle = new Particle(newCenter, this);
    newParticle.radius = newRadius;

    Particle[] particlesToExclude = this.parent == null ? new Particle[] {this} : new Particle[] {this, this.parent};
    ZonesNN.NearestInfo nearestParticleInfo = zonesNN.nearestTo(newParticle, particlesToExclude);
    if (nearestParticleInfo == null
        || nearestParticleInfo.distance > 0) { // >= -1/Particle.RADIUS_RATIO) {

      if (nearestParticleInfo != null) {
        // console.log('nearestParticleInfo.distance: ' + nearestParticleInfo.distance);
        newParticle.nearest = nearestParticleInfo.particle;
        // println(nearestParticleInfo.distance);
      } else {
        newParticle.nearest = null;
      }

      // The candidate particle got accepted.
      newParticle.theta = newTheta;
      newParticle.generation = newGeneration;

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
  private double normal() {
    double u = 0;
    double v = 0;
    while(u == 0) {
      u = Math.random(); //Converting [0,1) to (0,1)
    }
    while(v == 0) {
      v = Math.random();
    }
    return Math.sqrt( -2.0 * Math.log(u) ) * Math.cos(2.0 * Math.PI * v);
  }
  void draw(PGraphics graphics) {
    float drawingRadius = radius * RADIUS_RATIO;
    //graphics.stroke(0, 0, 0);
    //graphics.strokeWeight(1);
    graphics.strokeWeight(0);
    graphics.fill(0);
    graphics.ellipse(center.x, center.y, 2 * drawingRadius, 2 * drawingRadius);
    drawParentConnection(graphics, 2 * drawingRadius);
  }
  void drawParentConnection(PGraphics graphics, float strokeWidth) {
    if (parent != null) {
      graphics.strokeWeight(strokeWidth);
      graphics.line(parent.center.x, parent.center.y, center.x, center.y);
    }
  }
  void drawNearestConnection(PGraphics graphics) {
    if (nearest != null) {
      graphics.stroke(255, 0, 0);
      graphics.strokeWeight(1);
      graphics.line(center.x, center.y, nearest.center.x, nearest.center.y);
    }
  }
}