uniform float uTime;
uniform float uPostionFrequency;
uniform float uStrength;
uniform float uWarpFrequency;
uniform float uWarpStrength;

#include ../Includes/simplexNoise2d.glsl

float getElevation(vec2 position)
{
    vec2 warpedPosition = position;
    warpedPosition += uTime * 0.2;
    warpedPosition += simplexNoise2d(warpedPosition * uPostionFrequency * uWarpFrequency) * uWarpStrength;

    float elevation = 0.0;
    elevation += simplexNoise2d(warpedPosition * uPostionFrequency      ) / 2.0;
    elevation += simplexNoise2d(warpedPosition * uPostionFrequency * 1.8) / 4.0;
    elevation += simplexNoise2d(warpedPosition * uPostionFrequency * 2.8) / 8.0;

    float elevationSign = sign(elevation);
    elevation = pow(abs(elevation), 2.0) * elevationSign;

    elevation *= uStrength;

    return elevation;
}
void main()
{
    // Neighbours position
    float shift = 0.01;
    vec3 positionA = position.xyz + vec3(shift, 0.0, 0.0);
    vec3 positionB = position.xyz + vec3(0.0 , 0.0, shift);

    // Elevation
    float elevation = getElevation(csm_Position.xz);
    csm_Position.y += elevation;
    positionA.y = getElevation(positionA.xz);
    positionB.y = getElevation(positionB.xz);

    // Compute normals
    vec3 toA = normalize(positionA - csm_Position);
    vec3 toB = normalize(positionB - csm_Position);
    csm_Normal = cross(toA, toB);
}