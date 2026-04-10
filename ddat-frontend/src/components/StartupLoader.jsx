import { useState } from "react";

const PARTICLE_COUNT = 34;
const SHARD_COUNT = 12;

const createParticle = (index) => {
  const angle =
    (index / PARTICLE_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.55;
  const outwardRadius = 18 + Math.random() * 30;
  const inwardRadius = 2 + Math.random() * 10;
  const verticalLift = 8 + Math.random() * 18;
  const travelBias = index % 3 === 0 ? -1 : 1;

  return {
    id: index,
    size: 3 + Math.random() * 5,
    delay: Math.random() * 780 + index * 18,
    duration: 1200 + Math.random() * 720,
    color:
      Math.random() > 0.72
        ? "var(--color-yellow)"
        : Math.random() > 0.35
          ? "#ff8a3d"
          : "#ff5f57",
    glow:
      Math.random() > 0.5
        ? "rgba(255, 225, 124, 0.95)"
        : "rgba(255, 122, 24, 0.85)",
    startX:
      Math.cos(angle) * outwardRadius + travelBias * (24 + Math.random() * 34),
    startY: Math.sin(angle) * outwardRadius + 26 + Math.random() * 44,
    endX: Math.cos(angle) * inwardRadius,
    endY: Math.sin(angle) * inwardRadius - verticalLift,
  };
};

const createShard = (index) => {
  const angle =
    (index / SHARD_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
  const travel = 18 + Math.random() * 28;

  return {
    id: index,
    delay: 1950 + index * 22,
    duration: 580 + Math.random() * 220,
    width: 14 + Math.random() * 24,
    height: 3 + Math.random() * 3,
    rotate: Math.random() * 28 - 14,
    x: Math.cos(angle) * travel,
    y: Math.sin(angle) * travel - 6,
  };
};

export default function StartupLoader({ phase = "visible" }) {
  const [particles] = useState(() =>
    Array.from({ length: PARTICLE_COUNT }, (_, index) => createParticle(index)),
  );
  const [shards] = useState(() =>
    Array.from({ length: SHARD_COUNT }, (_, index) => createShard(index)),
  );

  const isShattering = phase === "shattering";

  return (
    <div
      className={`startup-loader ${isShattering ? "startup-loader--shatter" : ""} ${phase === "hidden" ? "startup-loader--exit" : ""}`}
      role="status"
      aria-live="polite"
      aria-label="Loading app"
    >
      <div className="startup-loader__backdrop" aria-hidden="true" />
      <div className="startup-loader__embers" aria-hidden="true">
        {particles.map((particle) => (
          <span
            key={particle.id}
            className="startup-loader__particle"
            style={{
              "--size": `${particle.size}px`,
              "--delay": `${particle.delay}ms`,
              "--duration": `${particle.duration}ms`,
              "--color": particle.color,
              "--glow": particle.glow,
              "--start-x": `${particle.startX}vw`,
              "--start-y": `${particle.startY}vh`,
              "--end-x": `${particle.endX}vw`,
              "--end-y": `${particle.endY}vh`,
            }}
          />
        ))}
      </div>

      <div className="startup-loader__core">
        <div className="startup-loader__pulse" aria-hidden="true" />
        <div className="startup-loader__shards" aria-hidden="true">
          {shards.map((shard) => (
            <span
              key={shard.id}
              className="startup-loader__shard"
              style={{
                "--shard-delay": `${shard.delay}ms`,
                "--shard-duration": `${shard.duration}ms`,
                "--shard-width": `${shard.width}px`,
                "--shard-height": `${shard.height}px`,
                "--shard-rotate": `${shard.rotate}deg`,
                "--shard-x": `${shard.x}vw`,
                "--shard-y": `${shard.y}vh`,
              }}
            />
          ))}
        </div>
        <img
          src="/singularity_new_logo.png"
          alt="Singularity Ops logo"
          className={`startup-loader__logo ${isShattering ? "startup-loader__logo--shatter" : ""}`}
        />
      </div>

      <div className="startup-loader__caption">Forging the interface</div>
    </div>
  );
}
