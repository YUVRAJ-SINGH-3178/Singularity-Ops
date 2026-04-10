import { useState } from "react";

const EMBER_COUNT = 44;
const SMOKE_COUNT = 8;

const createEmber = (index) => {
  const startX = Math.random() * 260 - 130;
  const endX = startX * (0.25 + Math.random() * 0.8);

  return {
    id: index,
    size: 2 + Math.random() * 5,
    delay: Math.random() * 1500,
    duration: 1000 + Math.random() * 1200,
    color:
      Math.random() > 0.78
        ? "var(--color-yellow)"
        : Math.random() > 0.45
          ? "#ff9a48"
          : "#ff5f57",
    startX: `${startX}px`,
    endX: `${endX}px`,
    lift: `${120 + Math.random() * 220}px`,
  };
};

const createSmoke = (index) => {
  const startX = Math.random() * 160 - 80;
  const driftX = startX + (Math.random() * 120 - 60);
  return {
    id: index,
    width: 34 + Math.random() * 42,
    height: 16 + Math.random() * 24,
    delay: Math.random() * 2000,
    duration: 2400 + Math.random() * 1800,
    startX: `${startX}px`,
    driftX: `${driftX}px`,
    lift: `${100 + Math.random() * 130}px`,
  };
};

export default function StartupLoader({ phase = "visible" }) {
  const [embers] = useState(() =>
    Array.from({ length: EMBER_COUNT }, (_, index) => createEmber(index)),
  );
  const [smoke] = useState(() =>
    Array.from({ length: SMOKE_COUNT }, (_, index) => createSmoke(index)),
  );

  const isShattering = phase === "shattering";

  return (
    <div
      className={`startup-loader ${isShattering ? "startup-loader--shatter" : ""} ${phase === "hidden" ? "startup-loader--exit" : ""}`}
      role="status"
      aria-live="polite"
      aria-label="Loading app"
    >
      <div className="startup-loader__noise" aria-hidden="true" />
      <div className="startup-loader__grid" aria-hidden="true" />

      <div className="startup-loader__stage">
        <div className="startup-loader__logo-zone">
          <div className="startup-loader__halo" aria-hidden="true" />
          <div className="startup-loader__fireback" aria-hidden="true">
            <span className="startup-loader__heat-wave startup-loader__heat-wave--left" />
            <span className="startup-loader__heat-wave startup-loader__heat-wave--mid" />
            <span className="startup-loader__heat-wave startup-loader__heat-wave--right" />
          </div>

          <div className="startup-loader__embers" aria-hidden="true">
            {embers.map((ember) => (
              <span
                key={ember.id}
                className="startup-loader__ember"
                style={{
                  "--ember-size": `${ember.size}px`,
                  "--ember-delay": `${ember.delay}ms`,
                  "--ember-duration": `${ember.duration}ms`,
                  "--ember-color": ember.color,
                  "--ember-start-x": ember.startX,
                  "--ember-end-x": ember.endX,
                  "--ember-lift": ember.lift,
                }}
              />
            ))}
          </div>

          <div className="startup-loader__smoke" aria-hidden="true">
            {smoke.map((cloud) => (
              <span
                key={cloud.id}
                className="startup-loader__smoke-puff"
                style={{
                  "--smoke-width": `${cloud.width}px`,
                  "--smoke-height": `${cloud.height}px`,
                  "--smoke-delay": `${cloud.delay}ms`,
                  "--smoke-duration": `${cloud.duration}ms`,
                  "--smoke-start-x": cloud.startX,
                  "--smoke-drift-x": cloud.driftX,
                  "--smoke-lift": cloud.lift,
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
      </div>

      <div className="startup-loader__shatter" aria-hidden="true">
        {embers.slice(0, 12).map((ember) => (
          <span
            key={`shatter-${ember.id}`}
            className="startup-loader__shard"
            style={{
              "--shard-delay": `${1600 + ember.id * 20}ms`,
              "--shard-duration": `${460 + ember.id * 8}ms`,
              "--shard-x": ember.endX,
              "--shard-y": ember.lift,
            }}
          />
        ))}
      </div>
    </div>
  );
}
