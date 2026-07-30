/**
 * Both agent GLBs (`/models/agent-core.glb`, `/models/lead-core.glb`) are
 * exported with `EXT_meshopt_compression`. Without a registered Meshopt
 * decoder, `GLTFLoader` throws on parse — this is the single most likely
 * runtime failure in this build, so it is wired in exactly one place and
 * every `useGLTF` call in the app must pass `extendMeshopt` as its loader
 * extension callback.
 */
// The loader type MUST come from three-stdlib, not three/examples/jsm: drei
// types `useGLTF`'s extendLoader against three-stdlib's GLTFLoader, and the
// two are structurally different classes that share a name. Importing the
// three/examples one here produces the notoriously confusing error
// "Type 'GLTFLoader' is missing the following properties from type 'GLTFLoader'".
// The decoder value stays on three's canonical upstream module —
// setMeshoptDecoder accepts it as `any`.
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import type { GLTFLoader } from 'three-stdlib';

export function extendMeshopt(loader: GLTFLoader): void {
  loader.setMeshoptDecoder(MeshoptDecoder);
}
