import { instantiateBoids } from "./boid-utils.js";
import { setZOrderForMainGameElements } from "./zOrdering.js";
import { Physics } from "../../Shared-Game-Assets/js/physics.js";
import { Vec2 } from "../../Shared-Game-Assets/js/vector.js";

// Used to determine if pointer is held down
let pointerDownTime = 0;
const holdThreshold = 0.1; // seconds
let holdTimer = null;

// Export so other scripts can access this
export class MainGameScene extends Phaser.Scene {
  constructor() {
    super({ key: "MainGameScene" });
    this.boids = [];
    this.gameStarted = false;
    this.isInteracting = false; // is the  player actively interacting with the game?
    this.uiMenuOpen = false;

    // Store the last known window size so we can update boids positions etc.
    // based on this as the screen size changes
    this.lastKnownWindowSize = new Vec2(0, 0);
  }

  preload() {
    // Preload assets if needed
    this.load.image("Bad Boid", "./pngs/Bad_Boid.png");
    this.load.image("Good Boid", "./pngs/Good_Boid.png");
    this.load.image("Leader Boid", "./pngs/Leader_Boid.png");
    this.load.spritesheet(
      "Bad Boid Anim",
      "./pngs/Bad_Boid_Anim_Spritesheet.png",
      { frameWidth: 200, frameHeight: 200 }
    );
    this.load.spritesheet(
      "Good Boid Anim",
      "./pngs/Good_Boid_Anim_Spritesheet.png",
      { frameWidth: 200, frameHeight: 200 }
    );
    this.load.spritesheet(
      "Leader Boid Anim",
      "./pngs/Leader_Boid_Anim_Spritesheet.png",
      { frameWidth: 200, frameHeight: 200 }
    );
  }

  create() {
    // Set the Z order of all elements
    setZOrderForMainGameElements(this.game);

    // Observe window resizing with ResizeObserver since it works
    // better than window.addEventListener("resize", this.handleWindowResize.bind(this));
    // Seems to be more responsive to quick snaps and changes.
    this.lastKnownWindowSize = new Vec2(window.innerWidth, window.innerHeight);
    const resizeObserver = new ResizeObserver((entries) => {
      this.handleWindowResize();
    });
    resizeObserver.observe(document.documentElement);

    this.subscribeToEvents();
    this.disableScroll();

    // Spawn in x random boids as a Promise (so that we can run this async), and then
    // when that promise is fufilled, we can move on to other init logic

    instantiateBoids(this, 40).then((boids) => {
      this.boids = boids;

      // Continue with other initialization logic after boids are instantiated:
      // more code here eventually ...

      // After everything is loaded in, we can begin the game
      this.gameStarted = true;
    });
  }

  update(time, delta) {
    if (this.gameStarted) {
      // Check if it's time to perform a physics update
      if (
        time - Physics.lastPhysicsUpdateTime >=
        Physics.physicsUpdateInterval
      ) {
        Physics.performPhysicsUpdate(time);

        // Handle the boid physics
        for (let boid of this.boids) {
          boid.handlePhysics(this.boids);
        }
      }
    }
  }

  // Disable scrolling
  disableScroll() {
    //document.body.style.overflow = "hidden"; // this prevents the page from being able to overflow (aka have more content out of view that you can see via scrolling)
    document.addEventListener("touchmove", this.preventDefault.bind(this), {
      passive: false,
    });

    document.addEventListener(
      "mousewheel",
      this.preventDefault.bind(this), // Bind 'this' to refer to the class instance
      {
        passive: false,
      }
    );
  }

  // Enable scrolling
  enableScroll() {
    //document.body.style.overflow = "";
    document.removeEventListener("touchmove", preventDefault);
    document.removeEventListener("mousewheel", preventDefault);
  }

  // Prevent default behavior of events (used in this case for disabling scroll)
  preventDefault(event) {
    //event.preventDefault();
  }

  subscribeToEvents() {
    // Event listener for ui menu open / closed
    document.addEventListener(
      "uiMenuOpen",
      function (event) {
        if (this.uiMenuOpen == false) {
          this.uiMenuOpen = true;
        }
      }.bind(this)
    ); // Bind 'this' to refer to the class instance
    document.addEventListener(
      "uiMenuClosed",
      function (event) {
        if (this.uiMenuOpen == true) {
          this.uiMenuOpen = false;
        }
      }.bind(this)
    ); // Bind 'this' to refer to the class instance

    // Event listener to detect when the user interacts with the game
    document.addEventListener(
      "pointerdown",
      function () {
        this.isInteracting = true;
      }.bind(this),
      { capture: true }
    );

    document.addEventListener(
      "pointerup",
      function () {
        this.isInteracting = false;
      }.bind(this),
      { capture: true }
    ); // Bind 'this' to refer to the class instance

    // Custom event that fires whenever pointer is held down longer than threshold during a click.
    // Pretty much for any "long" click tasks, like hold for this long to call this function.
    document.addEventListener(
      "pointerdown",
      function () {
        // Define holdTimer if it is not already (note that it gets cleared on pointerup below)
        pointerDownTime = Date.now();
        if (!holdTimer) {
          // Check holdThreshold seconds from now if we are still holding down pointer.
          holdTimer = setTimeout(() => {
            // If we are still holding down, dispatch pointerholdclick to tell the event listeners that we are held down
            let holdDuration = Date.now() - pointerDownTime;
            if (holdDuration >= holdThreshold) {
              document.dispatchEvent(new Event("pointerholdclick"));
            }

            // Reset holdTimer after it's triggered
            holdTimer = null;
          }, holdThreshold * 1000); // sec -> millisec
        }

        // When the pointer is released, clear the hold timer
        const pointerUpListener = () => {
          // Reset holdTimer when pointer is released
          clearTimeout(holdTimer);
          holdTimer = null;

          // Remove the event listener so that we only listen for pointerup once.
          // For reference, we re-listen for pointerup each time we hold down again.
          document.removeEventListener("pointerup", pointerUpListener);
        };
        document.addEventListener("pointerup", pointerUpListener, {
          once: true,
        });
      },
      { capture: true }
    );
  }

  // Function to handle window resize event
  handleWindowResize() {
    // Get the new screen dimensions
    let screenWidth = window.innerWidth;
    let screenHeight = window.innerHeight;

    // Update positions of all boids based on new screen dimensions.
    // We want to retain the general location of the boid, so we try to position it
    // the same screen % it was before on the new screen.
    for (let boid of this.boids) {
      // Everything but main boid:
      if (boid.mainBoid == false) {
        // Calculate new position based on percentage of old position
        let new_x = (boid.graphic.x / this.lastKnownWindowSize.x) * screenWidth;
        let new_y =
          (boid.graphic.y / this.lastKnownWindowSize.y) * screenHeight;

        // handle re-sizing etc. of boid
        boid.handleWindowResize(new_x, new_y);
      }
      // Main boid only:
      else {
        // handle re-sizing etc. of boid ONLY... no new position like other boids
        boid.handleWindowResize(boid.graphic.x, boid.graphic.y);
      }
    }

    // Update lastKnownWindowSize to current screen dimensions
    this.lastKnownWindowSize = new Vec2(screenWidth, screenHeight);
  }
}
