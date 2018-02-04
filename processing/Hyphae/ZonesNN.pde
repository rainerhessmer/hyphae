// Helper class used to find closest particles. Particles are collected by zones
// ('buckets' in 2d). To find particles in the vicinity only the closest zones
// need to be searched.
class ZonesNN {
  private float zoneSize;
  int xLength;
  int yLength;
  private ArrayList<Particle>[] zones;
  
  ZonesNN(int width, int height, float maxParticleSize) {
    this.zoneSize = 2 * maxParticleSize;

    // We add to the count to allow for empty zones surrounding the field.
    this.xLength = 2 + floor(width / maxParticleSize);
    this.yLength = 2 + floor(height / maxParticleSize);

/*
    this.zones = Array.apply(
        null, new Array(this.xLength * this.yLength))
        .map(function(){
          return [];
        }
      );
*/
    zones = new ArrayList[this.xLength * this.yLength];
    for (int i = 0; i < zones.length; i++) {
      zones[i] = new ArrayList();
    }
  }
  public void insert(Particle particle) {
    int zoneIndex = getZoneIndex(particle);
    zones[zoneIndex].add(particle);
  }
  
  class NearestInfo {
    public Particle particle;
    public float distance;
    
    NearestInfo(Particle particle, float distance) {
      this.particle = particle;
      this.distance = distance;
    }
  }
  
  public NearestInfo nearestTo(Particle particle, Particle[] excludedParticles) {
    // We search the zone that new Particle is in as well as the eight
    // surounding cells.
    int centerIndex = getZoneIndex(particle);
    int aboveIndex = centerIndex - yLength;
    int belowIndex = centerIndex + yLength;
    int[] indexesToSearch = new int[]{
        aboveIndex - 1, aboveIndex, aboveIndex + 1,
        centerIndex - 1, centerIndex, centerIndex + 1,
        belowIndex - 1, belowIndex, belowIndex + 1
    };
    NearestInfo nearestInfo = null;
    for (int i = 0; i < indexesToSearch.length; i++) {
      nearestInfo = nearestToInZone(
          particle, excludedParticles, indexesToSearch[i], nearestInfo);
    }
    return nearestInfo;
  }
  private NearestInfo nearestToInZone(Particle particle, Particle[] excludedParticles, int zoneIndex, NearestInfo soFarNearestInfo) {
    ArrayList<Particle> particlesInZone = zones[zoneIndex];
    if (particlesInZone.isEmpty()) {
      return soFarNearestInfo;
    }
    Particle nearestParticle = null;
    float nearestDistance;
    if (soFarNearestInfo == null) {
      nearestDistance = Float.MAX_VALUE;
    } else {
      nearestParticle = soFarNearestInfo.particle;
      nearestDistance = soFarNearestInfo.distance;
    }

    for (Particle particleInZone : particlesInZone) {
      for (Particle excludedParticle : excludedParticles) {
        if (particleInZone == excludedParticle) {
          continue; //<>//
        }
      }

      float distance = particle.distance(particleInZone);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestParticle = particleInZone;
      }
    }

    if (nearestParticle == null) {
      return null;
    } else {
      return new NearestInfo(nearestParticle, nearestDistance);
    }
  }
  private int getZoneIndex(Particle particle) {
    int xIndex = 1 + floor(particle.center.x / zoneSize);
    int yIndex = 1 + floor(particle.center.y / zoneSize);

    int zoneIndex = xIndex * yLength + yIndex;
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