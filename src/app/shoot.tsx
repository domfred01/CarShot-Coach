import React from 'react';

import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useFrameOutput,
} from 'react-native-vision-camera';

import { useTensorflowModel } from 'react-native-fast-tflite';

const MODEL_SIZE = 320;

/**
 * Converts an RGBA camera pixel buffer into the
 * Float32 RGB tensor required by EfficientDet.
 *
 * Camera:
 *   rgb-rgba-8-bit
 *
 * Model:
 *   [1, 320, 320, 3]
 *
 * Pixel values:
 *   0-255
 *
 * Converted to:
 *   0-1
 */
function rgbaToModelInput(
  pixelBuffer: ArrayBuffer,
  sourceWidth: number,
  sourceHeight: number,
  bytesPerRow: number,
): ArrayBuffer {
  'worklet';

  const source = new Uint8Array(pixelBuffer);

  // EfficientDet input:
  // 320 x 320 x 3 Float32
  const inputBuffer = new ArrayBuffer(
    MODEL_SIZE * MODEL_SIZE * 3 * 4,
  );

  const input = new Float32Array(inputBuffer);

  /**
   * Preserve camera aspect ratio.
   *
   * Anything outside the resized image
   * becomes black.
   */
  const scale = Math.min(
    MODEL_SIZE / sourceWidth,
    MODEL_SIZE / sourceHeight,
  );

  const resizedWidth = Math.max(
    1,
    Math.round(sourceWidth * scale),
  );

  const resizedHeight = Math.max(
    1,
    Math.round(sourceHeight * scale),
  );

  const offsetX = Math.floor(
    (MODEL_SIZE - resizedWidth) / 2,
  );

  const offsetY = Math.floor(
    (MODEL_SIZE - resizedHeight) / 2,
  );

  for (let y = 0; y < MODEL_SIZE; y++) {
    for (let x = 0; x < MODEL_SIZE; x++) {
      const inputIndex =
        (y * MODEL_SIZE + x) * 3;

      const resizedX = x - offsetX;
      const resizedY = y - offsetY;

      // Outside letterboxed image = black.
      if (
        resizedX < 0 ||
        resizedX >= resizedWidth ||
        resizedY < 0 ||
        resizedY >= resizedHeight
      ) {
        input[inputIndex] = 0;
        input[inputIndex + 1] = 0;
        input[inputIndex + 2] = 0;
        continue;
      }

      // Convert model coordinates back to source coordinates.
      const sourceX = Math.min(
        sourceWidth - 1,
        Math.floor(resizedX / scale),
      );

      const sourceY = Math.min(
        sourceHeight - 1,
        Math.floor(resizedY / scale),
      );

      /**
       * Camera format:
       *
       * R = +0
       * G = +1
       * B = +2
       * A = +3
       *
       * IMPORTANT:
       * Use bytesPerRow instead of assuming
       * width * 4.
       */
      const sourceIndex =
        sourceY * bytesPerRow +
        sourceX * 4;

      input[inputIndex] =
        source[sourceIndex] / 255;

      input[inputIndex + 1] =
        source[sourceIndex + 1] / 255;

      input[inputIndex + 2] =
        source[sourceIndex + 2] / 255;
    }
  }

  return inputBuffer;
}

export default function ShootScreen() {
  const device = useCameraDevice('back');

  const {
    hasPermission,
    requestPermission,
  } = useCameraPermission();

  const [showInstructions, setShowInstructions] =
    React.useState(true);

  const [showExample, setShowExample] =
    React.useState(false);

  const [frameCount, setFrameCount] =
    React.useState(0);

  const [carDetected, setCarDetected] =
    React.useState(false);

  const [carConfidence, setCarConfidence] =
    React.useState(0);

  /**
   * Load EfficientDet Lite0.
   */
  const model = useTensorflowModel(
    require('../../assets/efficientdet.tflite'),
    [],
  );

  /**
   * Request camera permission.
   */
  React.useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [
    hasPermission,
    requestPermission,
  ]);

  /**
   * Log model information and perform
   * a basic test inference.
   */
  React.useEffect(() => {
    if (model.state !== 'loaded') {
      console.log(
        '[CarShot] TFLite model state:',
        model.state,
      );
      return;
    }

    console.log(
      '[CarShot] TFLite model loaded',
    );

    console.log(
      '[CarShot] Inputs:',
      model.model.inputs,
    );

    console.log(
      '[CarShot] Outputs:',
      model.model.outputs,
    );

    /**
     * Run a static test image.
     */
    try {
      const testInputBuffer =
        new ArrayBuffer(
          MODEL_SIZE *
            MODEL_SIZE *
            3 *
            4,
        );

      const testInput =
        new Float32Array(
          testInputBuffer,
        );

      // Neutral gray test image.
      testInput.fill(0.5);

      console.log(
        '[CarShot] Running TFLite test input...',
      );

      const testOutputs =
        model.model.runSync([
          testInputBuffer,
        ]);

      console.log(
        '[CarShot] TFLite test SUCCESS',
      );

      console.log(
        '[CarShot] Output count:',
        testOutputs.length,
      );

      if (testOutputs.length >= 2) {
        console.log(
          '[CarShot] Output 0 bytes:',
          testOutputs[0].byteLength,
        );

        console.log(
          '[CarShot] Output 1 bytes:',
          testOutputs[1].byteLength,
        );
      }
    } catch (error) {
      console.error(
        '[CarShot] TFLite test FAILED:',
        error,
      );
    }
  }, [model.state]);

  /**
   * Camera frame output.
   *
   * IMPORTANT:
   *
   * We reference model.model directly inside
   * the worklet instead of storing it in a
   * separate actualModel variable that can
   * become stale/undefined.
   */
  const frameOutput = useFrameOutput({
    pixelFormat: 'rgb',

    targetResolution: {
      width: MODEL_SIZE,
      height: MODEL_SIZE,
    },

    dropFramesWhileBusy: true,

    onFrame(frame) {
      'worklet';

      console.log(
        '[CarShot] CAMERA FRAME:',
        frame.width,
        'x',
        frame.height,
        'format:',
        frame.pixelFormat,
        'buffer:',
        frame.hasPixelBuffer,
        'bytesPerRow:',
        frame.bytesPerRow,
      );

      /**
       * The model is only usable after loading.
       *
       * We check the model property directly.
       */
      if (
        !frame.isValid ||
        !frame.hasPixelBuffer
      ) {
        console.log(
          '[CarShot] Frame rejected: no pixel buffer',
        );

        frame.dispose();
        return;
      }

      /**
       * We specifically expect the Android
       * RGBA format that your emulator is
       * currently producing.
       */
      if (
        frame.pixelFormat !==
        'rgb-rgba-8-bit'
      ) {
        console.log(
          '[CarShot] Frame rejected: unexpected pixel format',
          frame.pixelFormat,
        );

        frame.dispose();
        return;
      }

      /**
       * Get the native camera pixel buffer.
       */
      let pixelBuffer: ArrayBuffer;

      try {
        pixelBuffer =
          frame.getPixelBuffer();
      } catch (error) {
        console.error(
          '[CarShot] Failed to get pixel buffer:',
          error,
        );

        frame.dispose();
        return;
      }

      /**
       * Convert:
       *
       * RGBA uint8
       *
       * into:
       *
       * RGB Float32
       *
       * [1,320,320,3]
       */
      let inputBuffer: ArrayBuffer;

      try {
        inputBuffer =
          rgbaToModelInput(
            pixelBuffer,
            frame.width,
            frame.height,
            frame.bytesPerRow,
          );
      } catch (error) {
        console.error(
          '[CarShot] Image conversion FAILED:',
          error,
        );

        frame.dispose();
        return;
      }

      /**
       * Run live camera data through TFLite.
       *
       * The model is accessed directly from
       * the Nitro HybridObject.
       */
      if (model.state !== 'loaded') {
        console.log(
          '[CarShot] Model not loaded inside frame callback:',
          model.state,
        );

        frame.dispose();
        return;
      }

      try {
        const outputs =
          model.model.runSync([
            inputBuffer,
          ]);

        console.log(
          '[CarShot] CAMERA TFLite SUCCESS',
          'outputs:',
          outputs.length,
        );

        if (outputs.length >= 2) {
          console.log(
            '[CarShot] Live output 0 bytes:',
            outputs[0].byteLength,
          );

          console.log(
            '[CarShot] Live output 1 bytes:',
            outputs[1].byteLength,
          );
        }
      } catch (error) {
        console.error(
          '[CarShot] CAMERA TFLite FAILED:',
          error,
        );
      }

      /**
       * Always release the camera frame.
       */
      frame.dispose();
    },
  });

  /**
   * Debug counter.
   *
   * This is currently a once-per-second UI
   * counter rather than the exact camera FPS.
   */
  React.useEffect(() => {
    const interval = setInterval(() => {
      setFrameCount(
        value => value + 1,
      );
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  /**
   * Camera permission screen.
   */
  if (!hasPermission) {
    return (
      <View
        style={
          styles.permissionContainer
        }
      >
        <Text
          style={
            styles.permissionTitle
          }
        >
          Camera Access Needed
        </Text>

        <Text
          style={
            styles.permissionText
          }
        >
          CarShot Coach needs access to your
          camera to guide your car photos.
        </Text>

        <Pressable
          style={
            styles.permissionButton
          }
          onPress={requestPermission}
        >
          <Text
            style={
              styles.permissionButtonText
            }
          >
            Allow Camera
          </Text>
        </Pressable>
      </View>
    );
  }

  /**
   * Camera device loading screen.
   */
  if (device == null) {
    return (
      <View
        style={
          styles.permissionContainer
        }
      >
        <Text
          style={
            styles.permissionTitle
          }
        >
          Camera Loading
        </Text>

        <Text
          style={
            styles.permissionText
          }
        >
          Preparing the camera...
        </Text>
      </View>
    );
  }

  /**
   * Main shooting screen.
   */
  return (
    <View style={styles.container}>
      <Camera
        style={styles.camera}
        device={device}
        isActive={true}
        outputs={[frameOutput]}
      />

      <View
        style={styles.overlay}
        pointerEvents="box-none"
      >
        <View style={styles.topSection}>
          <Text style={styles.title}>
            FRONT 3/4
          </Text>

          {/* HOW TO SHOOT */}
          <View style={styles.dropdown}>
            <Pressable
              style={
                styles.dropdownHeader
              }
              onPress={() =>
                setShowInstructions(
                  !showInstructions,
                )
              }
            >
              <Text
                style={
                  styles.dropdownTitle
                }
              >
                How to shoot
              </Text>

              <Text
                style={
                  styles.dropdownArrow
                }
              >
                {showInstructions
                  ? '▲'
                  : '▼'}
              </Text>
            </Pressable>

            {showInstructions && (
              <View
                style={
                  styles.dropdownContent
                }
              >
                <Text
                  style={
                    styles.instruction
                  }
                >
                  Position the car so the front
                  and one side are clearly visible.
                </Text>

                <Text
                  style={
                    styles.instructionBullet
                  }
                >
                  • Keep the entire car in frame
                </Text>

                <Text
                  style={
                    styles.instructionBullet
                  }
                >
                  • Keep the camera around
                  headlight height
                </Text>

                <Text
                  style={
                    styles.instructionBullet
                  }
                >
                  • Leave a little space around
                  the car
                </Text>
              </View>
            )}
          </View>

          {/* EXAMPLE SHOT */}
          <View style={styles.dropdown}>
            <Pressable
              style={
                styles.dropdownHeader
              }
              onPress={() =>
                setShowExample(
                  !showExample,
                )
              }
            >
              <Text
                style={
                  styles.dropdownTitle
                }
              >
                Example Shot
              </Text>

              <Text
                style={
                  styles.dropdownArrow
                }
              >
                {showExample
                  ? '▲'
                  : '▼'}
              </Text>
            </Pressable>

            {showExample && (
              <View
                style={
                  styles.exampleContent
                }
              >
                <Image
                  source={{
                    uri:
                      'https://images.squarespace-cdn.com/content/v1/618e69df3fb749481d219d23/296134a9-7f8b-48e4-861c-514693673f8e/DSC_9784.jpg',
                  }}
                  style={
                    styles.exampleImage
                  }
                  resizeMode="cover"
                />

                <Text
                  style={
                    styles.exampleCaption
                  }
                >
                  Aim for a composition like this.
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* GUIDE FRAME */}
        <View
          style={styles.guideFrame}
          pointerEvents="none"
        >
          <View
            style={
              styles.cornerTopLeft
            }
          />

          <View
            style={
              styles.cornerTopRight
            }
          />

          <View
            style={
              styles.cornerBottomLeft
            }
          />

          <View
            style={
              styles.cornerBottomRight
            }
          />

          <View
            style={styles.angleLine}
          />

          <Text
            style={styles.angleLabel}
          >
            3/4 ANGLE
          </Text>
        </View>

        {/* BOTTOM STATUS */}
        <View
          style={
            styles.bottomSection
          }
        >
          <View
            style={[
              styles.feedbackButton,
              {
                borderColor:
                  carDetected
                    ? '#22C55E'
                    : '#F59E0B',
              },
            ]}
          >
            <View
              style={[
                styles.feedbackDot,
                {
                  backgroundColor:
                    carDetected
                      ? '#22C55E'
                      : '#F59E0B',
                },
              ]}
            />

            <Text
              style={[
                styles.feedbackTitle,
                {
                  color:
                    carDetected
                      ? '#22C55E'
                      : '#F59E0B',
                },
              ]}
            >
              {carDetected
                ? 'CAR DETECTED'
                : 'LOOKING FOR CAR'}
            </Text>

            <Text
              style={
                styles.feedbackHint
              }
            >
              {carDetected
                ? `Confidence ${Math.round(
                    carConfidence * 100,
                  )}%`
                : 'Point the camera toward the car'}
            </Text>
          </View>

          <Text
            style={
              styles.feedbackMessage
            }
          >
            {carDetected
              ? 'Car detected in camera view'
              : 'Processing camera feed...'}
          </Text>

          <Text
            style={
              styles.debugText
            }
          >
            Frames: {frameCount}
          </Text>

          <Text
            style={
              styles.modelText
            }
          >
            AI Model: {model.state}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000',
  },

  camera: {
    flex: 1,
  },

  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 80,
    paddingBottom: 45,
  },

  topSection: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },

  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 14,
    textShadowColor:
      'rgba(0,0,0,0.9)',
    textShadowOffset: {
      width: 0,
      height: 2,
    },
    textShadowRadius: 5,
  },

  dropdown: {
    width: '100%',
    maxWidth: 360,
    marginBottom: 8,
  },

  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },

  dropdownTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    textShadowColor:
      'rgba(0,0,0,0.9)',
    textShadowOffset: {
      width: 0,
      height: 2,
    },
    textShadowRadius: 5,
  },

  dropdownArrow: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  dropdownContent: {
    paddingHorizontal: 4,
    paddingBottom: 8,
  },

  instruction: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 5,
    textShadowColor:
      'rgba(0,0,0,0.9)',
    textShadowOffset: {
      width: 0,
      height: 2,
    },
    textShadowRadius: 5,
  },

  instructionBullet: {
    color: '#fff',
    fontSize: 13,
    lineHeight: 19,
    textShadowColor:
      'rgba(0,0,0,0.9)',
    textShadowOffset: {
      width: 0,
      height: 2,
    },
    textShadowRadius: 5,
  },

  exampleContent: {
    width: '100%',
    paddingBottom: 10,
  },

  exampleImage: {
    width: '100%',
    height: 190,
    borderRadius: 12,
  },

  exampleCaption: {
    color: '#fff',
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
    textShadowColor:
      'rgba(0,0,0,0.9)',
    textShadowOffset: {
      width: 0,
      height: 2,
    },
    textShadowRadius: 5,
  },

  guideFrame: {
    width: 310,
    height: 210,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },

  cornerTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 45,
    height: 45,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#fff',
    borderTopLeftRadius: 8,
  },

  cornerTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 45,
    height: 45,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: '#fff',
    borderTopRightRadius: 8,
  },

  cornerBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 45,
    height: 45,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#fff',
    borderBottomLeftRadius: 8,
  },

  cornerBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 45,
    height: 45,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: '#fff',
    borderBottomRightRadius: 8,
  },

  angleLine: {
    position: 'absolute',
    width: 120,
    height: 2,
    backgroundColor: '#fff',
    opacity: 0.65,
    transform: [
      {
        rotate: '-20deg',
      },
    ],
  },

  angleLabel: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    opacity: 0.8,
  },

  bottomSection: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },

  feedbackButton: {
    minWidth: 230,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 18,
    borderWidth: 1.5,
    backgroundColor:
      'rgba(0,0,0,0.45)',
  },

  feedbackDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: 7,
  },

  feedbackTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1.5,
  },

  feedbackHint: {
    color: '#fff',
    opacity: 0.75,
    fontSize: 11,
    marginTop: 5,
  },

  feedbackMessage: {
    color: '#fff',
    fontSize: 13,
    marginTop: 10,
    textAlign: 'center',
    textShadowColor:
      'rgba(0,0,0,0.9)',
    textShadowOffset: {
      width: 0,
      height: 2,
    },
    textShadowRadius: 5,
  },

  debugText: {
    color: '#fff',
    opacity: 0.6,
    fontSize: 10,
    marginTop: 5,
  },

  modelText: {
    color: '#fff',
    opacity: 0.75,
    fontSize: 11,
    marginTop: 4,
  },

  permissionContainer: {
    flex: 1,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },

  permissionTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 12,
  },

  permissionText: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: 25,
  },

  permissionButton: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },

  permissionButtonText: {
    color: '#111',
    fontSize: 16,
    fontWeight: '700',
  },
});