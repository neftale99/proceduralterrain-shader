import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg'
import CustomShaderMaterial from 'three-custom-shader-material/vanilla'
import terrainVertexShader from './Shaders/Terrain/vertex.glsl'
import terrainFramentShader from './Shaders/Terrain/fragment.glsl'
import waterVertexShader from './Shaders/Water/vertex.glsl'
import waterFramentShader from './Shaders/Water/fragment.glsl'
import overlayVertexShader from './Shaders/Overlay/vertex.glsl'
import overlayFramentShader from './Shaders/Overlay/fragment.glsl'
import GUI from 'lil-gui'
import gsap from 'gsap'


/**
 * Loaders
 */
// Loading
const loaderElement = document.querySelector('.loading')
const loadingManager = new THREE.LoadingManager(
    // Loaded
    () => {
        gsap.delayedCall(1, () => {

            loaderElement.style.display = 'none'

            gsap.to(
                overlayMaterial.uniforms.uAlpha, 
                { duration: 1.5, value: 0, delay: 0.5 }
            )

            window.setTimeout(() => {
                initGUI()
            }, 2000)
        })
    },
    // Progress
    (itemUrl, itemsLoaded, itemsTotal) => 
    {
        loaderElement.style.display = 'block'
    }
)

const rgbeLoader = new RGBELoader(loadingManager)
const dracoLoader = new DRACOLoader(loadingManager)
dracoLoader.setDecoderPath('./draco/')
const gltfLoader = new GLTFLoader(loadingManager)
gltfLoader.setDRACOLoader(dracoLoader)
const textureLoader = new THREE.TextureLoader(loadingManager)


/**
 * Base
 */
// Debug
let debugObject = {}

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

/**
 * Overlay
 */
const overlayGeometry = new THREE.PlaneGeometry(2, 2, 1, 1)
const overlayMaterial = new THREE.ShaderMaterial({
    vertexShader: overlayVertexShader,
    fragmentShader: overlayFramentShader,
    uniforms: {
        uAlpha: new THREE.Uniform(1)
    },
    transparent: true,
    depthWrite: false,
})
const overlay = new THREE.Mesh(overlayGeometry, overlayMaterial)
scene.add(overlay)

/**
 * Environment map
 */
rgbeLoader.load('./Environment/golden_bay_2k.hdr', (environmentMap) =>
    {
        environmentMap.mapping = THREE.EquirectangularReflectionMapping
    
        scene.background = environmentMap
        scene.backgroundBlurriness = 0.5
        scene.environment = environmentMap
    })

/**
 * Texture
 */
const colorTexture = textureLoader.load('./Texture/Texture1/PaintedWood009B_2K-JPG_Color.jpg')
colorTexture.colorSpace = THREE.SRGBColorSpace
const roughnessTexture = textureLoader.load('./Texture/Texture1/PaintedWood009B_2K-JPG_Roughness.jpg')
roughnessTexture.colorSpace = THREE.SRGBColorSpace
const ambienOcclusionTexture = textureLoader.load('./Texture/Texture1/PaintedWood009B_2K-JPG_AmbientOcclusion.jpg')
ambienOcclusionTexture.colorSpace = THREE.SRGBColorSpace
const normalTexture = textureLoader.load('./Texture/Texture1/PaintedWood009B_2K-JPG_NormalGL.jpg')
normalTexture.colorSpace = THREE.SRGBColorSpace
const displacementTexture = textureLoader.load('./Texture/Texture1/PaintedWood009B_2K-JPG_Displacement.jpg')
displacementTexture.colorSpace = THREE.SRGBColorSpace


/**
 * Board
 */
const boardFill = new Brush(new THREE.BoxGeometry(11, 2, 11))
const boardHole = new Brush(new THREE.BoxGeometry(10, 2.1, 10))
// boardHole.position.y = 0.2
// boardHole.updateMatrixWorld()

// Evaluate
const evaluator = new Evaluator()
const board = evaluator.evaluate(boardFill, boardHole, SUBTRACTION)
board.geometry.clearGroups()
board.material = new THREE.MeshPhysicalMaterial({
    map: colorTexture,
    aoMap: ambienOcclusionTexture,
    aoMapIntensity: 1,
    displacementMap: displacementTexture,
    displacementScale: 0.0001,
    roughnessMap: roughnessTexture,
    roughness: 1,
    normalMap: normalTexture,
    clearcoat: 1,
    clearcoatRoughness: 1,
    // transmission: 1,
    // ior: 1.5,
    // thickness: 0.5
})
board.castShadow = true
board.receiveShadow = true
scene.add(board)

/**
 * Terrain
 */
const geometry = new THREE.PlaneGeometry(10, 10, 500, 500)
geometry.rotateX(- Math.PI * 0.5)
geometry.deleteAttribute('uv')
geometry.deleteAttribute('normal')

// Material
debugObject.colorWaterDeep = '#dbdbdb'
debugObject.colorWaterSurface = '#66a8ff'
debugObject.colorSand = '#e7eb00'
debugObject.colorGrass = '#3ba05d'
debugObject.colorSnow = '#ffffff'
debugObject.colorRock = '#525138'

const uniforms = {
    uTime: new THREE.Uniform(0),
    uPostionFrequency: new THREE.Uniform(0.256),
    uStrength: new THREE.Uniform(1.8),
    uWarpFrequency: new THREE.Uniform(6.13),
    uWarpStrength: new THREE.Uniform(0.23),

    // Colors
    uColorWaterDeep: new THREE.Uniform(new THREE.Color(debugObject.colorWaterDeep)),
    uColorWaterSurface: new THREE.Uniform(new THREE.Color(debugObject.colorWaterSurface)),
    uColorSand: new THREE.Uniform(new THREE.Color(debugObject.colorSand)),
    uColorGrass: new THREE.Uniform(new THREE.Color(debugObject.colorGrass)),
    uColorSnow: new THREE.Uniform(new THREE.Color(debugObject.colorSnow)),
    uColorRock: new THREE.Uniform(new THREE.Color(debugObject.colorRock))
}

const material = new CustomShaderMaterial({
    // CSM
    baseMaterial: THREE.MeshStandardMaterial,
    vertexShader: terrainVertexShader,
    fragmentShader: terrainFramentShader,
    uniforms: uniforms,
    silent: true,

    // MeshStandardMaterial
    metalness: 0,
    roughness: 0.5,
    color: '#85d534' 
})

const depthMaterial = new CustomShaderMaterial({
    // CSM
    baseMaterial: THREE.MeshDepthMaterial,
    vertexShader: terrainVertexShader,
    uniforms: uniforms,
    silent: true,

    // MeshStandardMaterial
    depthPacking: THREE.RGBADepthPacking
})

// Mesh
const terrain = new THREE.Mesh(geometry, material)
terrain.customDepthMaterial = depthMaterial
terrain.castShadow = true
terrain.receiveShadow = true
scene.add(terrain)

/**
 * Water
 */
debugObject.depthColor = '#0000ff'
debugObject.surfaceColor = '#8888ff'

const geometryWater = new THREE.PlaneGeometry(10, 10, 500, 500)
geometryWater.rotateX(- Math.PI * 0.5)
geometryWater.deleteAttribute('uv')
geometryWater.deleteAttribute('normal')

const uniformsWater = {
    uTime: new THREE.Uniform(0),
    uPostionFrequency: new THREE.Uniform(.253),
    uStrength: new THREE.Uniform(0.1),
    uWarpFrequency: new THREE.Uniform(10),
    uWarpStrength: new THREE.Uniform(0.402),
}

const waterMaterial = new CustomShaderMaterial({
        // CSM
        baseMaterial: THREE.MeshPhysicalMaterial,
        vertexShader: waterVertexShader,
        fragmentShader: waterFramentShader,
        uniforms: uniformsWater,
        transparent: true,
        silent: true,

        // MeshStandardMaterial
        transmission: 1,
        roughness: 0.3,
        color: '#ffffff' 
})

const water = new THREE.Mesh(geometryWater, waterMaterial)
water.position.y = - 0.1
scene.add(water)

// const wateraFolder = gui.addFolder('Water')
// wateraFolder.add(uniformsWater.uPostionFrequency, 'value', 0, 1, 0.001).name('Position Frequency')
// wateraFolder.add(uniformsWater.uStrength, 'value', 0, 7, 0.001).name('Strength')
// wateraFolder.add(uniformsWater.uWarpFrequency, 'value', 0, 10, 0.001).name('Warp Frequency')
// wateraFolder.add(uniformsWater.uWarpStrength, 'value', 0, 1, 0.001).name('Warp Strength') 

/**
 * Tweaks
 */
function initGUI()
{
    const gui = new GUI()

    const baseFolder = gui.addFolder('Base')
    // baseFolder.close()
    baseFolder.add(board.material, 'clearcoat', 0, 1, 0.0001).name('Clearcoat')
    baseFolder.add(board.material, 'clearcoatRoughness', 0, 1, 0.0001).name('Clearcoat Roughness')
    // baseFolder.add(board.material, 'transmission', 0, 1, 0.0001).name('Transmission')
    // baseFolder.add(board.material, 'ior', 0, 10, 0.0001).name('Ior')
    // baseFolder.add(board.material, 'thickness', 0, 1, 0.0001).name('Thickness')

    const folderTerrain = gui.addFolder('Terrain')
    // folderTerrain.close()
    folderTerrain.add(uniforms.uPostionFrequency, 'value', 0, 1, 0.001).name('Position Frequency')
    folderTerrain.add(uniforms.uStrength, 'value', 0, 7, 0.001).name('Strength')
    folderTerrain.add(uniforms.uWarpFrequency, 'value', 0, 10, 0.001).name('Warp Frequency')
    folderTerrain.add(uniforms.uWarpStrength, 'value', 0, 1, 0.001).name('Warp Strength')
    folderTerrain.addColor(debugObject, 'colorWaterSurface')
        .name('Water Surface')
        .onChange(() => 
            uniforms.uColorWaterSurface.value.set(debugObject.colorWaterSurface))
    folderTerrain.addColor(debugObject, 'colorWaterDeep')
        .name('Water Deep')
        .onChange(() => 
            uniforms.uColorWaterDeep.value.set(debugObject.colorWaterDeep))
    folderTerrain.addColor(debugObject, 'colorSand')
        .name('Sand')
        .onChange(() => 
            uniforms.uColorSand.value.set(debugObject.colorSand))
    folderTerrain.addColor(debugObject, 'colorGrass')
        .name('Grass')
        .onChange(() => 
            uniforms.uColorGrass.value.set(debugObject.colorGrass))
    folderTerrain.addColor(debugObject, 'colorSnow')
        .name('Snow')
        .onChange(() => 
            uniforms.uColorSnow.value.set(debugObject.colorSnow))
    folderTerrain.addColor(debugObject, 'colorRock')
        .name('Rock')
        .onChange(() => uniforms.uColorRock.value.set(debugObject.colorRock))
}

/**
 * Lights
 */
const directionalLight = new THREE.DirectionalLight('#ffffff', 2)
directionalLight.position.set(6.25, 3, 4)
directionalLight.castShadow = true
directionalLight.shadow.mapSize.set(1024, 1024)
directionalLight.shadow.camera.near = 0.1
directionalLight.shadow.camera.far = 30
directionalLight.shadow.camera.top = 8
directionalLight.shadow.camera.right = 8
directionalLight.shadow.camera.bottom = -8
directionalLight.shadow.camera.left = -8
scene.add(directionalLight)

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight,
    pixelRatio: Math.min(window.devicePixelRatio, 2)
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight
    sizes.pixelRatio = Math.min(window.devicePixelRatio, 2)

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(sizes.pixelRatio)
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(35, sizes.width / sizes.height, 0.1, 100)
camera.position.set(- 12, 9, 12)
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
})
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 0.5
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(sizes.pixelRatio)

/**
 * Animate
 */
const clock = new THREE.Clock()

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()

    // Uniforms
    uniforms.uTime.value = elapsedTime
    water.material.uniforms.uTime.value = elapsedTime

    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()