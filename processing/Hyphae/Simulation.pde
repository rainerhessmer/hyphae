class Simulation {
  final static int INIT_PARTICLE_COUNT = 5;
  final static float INIT_CIRCLE_RATIO = 0.45;
  final static float OUTER_CIRCLE_RATIO = 0.95;
  final static int CREATE_PARTICLE_ATTEMPTS_PER_STEP = 10000;
  // static get MAX_PARTICLE_COUNT() { return 200000; }

  private PGraphics graphics;
  private float initCircleRadius;
  private float outerCircleRadius;
  private PVector center;
  private ArrayList<Particle> particles;
  private ZonesNN zonesNN;
  private int iteration;
  
  Simulation(PGraphics graphics) {
    this.graphics = graphics;
    //this.maxParticles = 100000;
    initCircleRadius = INIT_CIRCLE_RATIO * 0.5 * min(graphics.width, graphics.height);

    center = new PVector(
      0.5 * graphics.width,
      0.5 * graphics.height
    );
    outerCircleRadius = 0.5 * OUTER_CIRCLE_RATIO * min(graphics.width, graphics.height);

    particles = new ArrayList();
    zonesNN = new ZonesNN(
        graphics.width, graphics.height,
        Particle.INITIAL_RADIUS);
    iteration = 0;
  }
  void init() {
    // Fill to create background.
    //this.ctx.fillStyle = '#FFFFFF';
    //this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    initParticles();
  }
  private void initParticles() {
    int i = 0;

    // initialize source nodes
    while (i < INIT_PARTICLE_COUNT) {
      // in circle
      PVector particleCenter = new PVector (
        (float)Math.random() * graphics.width,
        (float)Math.random() * graphics.height
      );
      if (particleCenter.dist(this.center) > this.initCircleRadius) {
        // try again
        continue;
      }

      Particle particle = new Particle(particleCenter, /*parent=*/ null);
      addParticle(particle);

      i += 1;
    }
  }
  private void addParticle(Particle particle) {
    this.particles.add(particle);
    this.zonesNN.insert(particle);
    //particle.draw(this.ctx);
    particle.draw(graphics);
  }
  public int step() {
    int newParticleCount = 0;
    int attempts = 0;
    //while (newParticleCount < 10) {
    while (attempts < CREATE_PARTICLE_ATTEMPTS_PER_STEP) {
      attempts++;
      iteration++;

      // Select a random particle
      int k = (int)Math.floor(Math.random() * particles.size());
      Particle particle = particles.get(k);

      // Potentially create a new particle.
      Particle newParticle = particle.createDescendant(this, zonesNN);
      if (newParticle != null) {
        addParticle(newParticle);
        //alert("new particle");
        newParticleCount++;
        if (newParticleCount > 100) {
          return newParticleCount;
        }
      }
    }
    // console.log('lastNewParticleCount: ' + lastNewParticleCount);
    // console.log('totalParticleCount: ' + this.particles.length);

    return newParticleCount;
  }
}