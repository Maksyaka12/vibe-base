import { Composition, registerRoot } from 'remotion';
import { Promo, DURATION } from './Promo';
import { Launch, LAUNCH_DURATION } from './launch/Launch';
import { FPS } from './theme';

function Root() {
  return (
    <>
      <Composition id="VibeHubPromo" component={Promo} durationInFrames={DURATION} fps={FPS} width={1920} height={1080} />
      <Composition id="VibeHubLaunch" component={Launch} durationInFrames={LAUNCH_DURATION} fps={FPS} width={1920} height={1080} />
    </>
  );
}

registerRoot(Root);
