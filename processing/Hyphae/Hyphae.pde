PGraphics hires;
Simulation simulation;
String fileNamePattern;
Boolean isPaused = false;

void setup() {
  hires = createGraphics(15000, 15000, P2D);
  hires.beginDraw();
  background(255, 255, 255);
  hires.endDraw();

  simulation = new Simulation(hires);
  simulation.init();

  size(1000, 1000, P2D);
  
  fileNamePattern = year() + nf(month(), 2) + nf(day(), 2) + "_" + nf(hour(), 2) + nf(minute(), 2) + nf(second(), 2) + "_";
} 

void draw() {
  if (isPaused) {
    return;
  }
  hires.beginDraw();
  simulation.step();
  hires.endDraw();
  
  PImage hiresImage = hires.get();
  
  float scalingFactor = 1.0 * width / hires.width;
  scale(scalingFactor);
  image(hiresImage, 0, 0);
  
  //println(frameCount);
  if (frameCount % 100 == 0) {
    saveFrame("_auto");
  }
}

void keyPressed(){
  if(key == ' '){
    saveFrame("_manual");
  } else if (key == 'p') {
    isPaused = !isPaused;
    println("isPaused: " + isPaused);
  }
}

void saveFrame(String suffix) {
  String fileName = fileNamePattern + nf(frameCount, 4) + suffix + ".png";
  println("Saving " + fileName + "  ...");
  hires.save(fileNamePattern + nf(frameCount, 4) + suffix + ".png");
  println("Done saving.");
}