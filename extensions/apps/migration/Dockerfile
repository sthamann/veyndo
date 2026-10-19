# Independent Rust migration service. Build context: repository root; no interpreter or commerce server in runtime.
FROM rust:1.96-bookworm AS build
WORKDIR /build
COPY Cargo.toml Cargo.lock LICENSE ./
COPY src ./src
COPY crates/ crates/
COPY extensions ./extensions
COPY migrations ./migrations
COPY fixtures ./fixtures
COPY reference/automation-registry.json ./reference/automation-registry.json
COPY reference/app-manifests ./reference/app-manifests
RUN cargo build --locked --release --package veyndo-migration --bin migration-assistant
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=build /build/target/release/migration-assistant /usr/local/bin/migration-assistant
USER 65532:65532
ENV MIGRATION_BIND=0.0.0.0:8809
EXPOSE 8809
ENTRYPOINT ["/usr/local/bin/migration-assistant", "serve"]
