# Build from the repository root. This optional service holds no Veyndo DB login.
FROM rust:1.96-bookworm AS build
WORKDIR /build
COPY Cargo.toml Cargo.lock LICENSE ./
COPY src/ src/
COPY crates/ crates/
COPY extensions/ extensions/
COPY fixtures/ fixtures/
COPY migrations/ migrations/
COPY reference/ reference/
RUN cargo build --release --locked --no-default-features --bin shopware-compat
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/* && useradd -u 10001 -m app
COPY --from=build /build/target/release/shopware-compat /app/shopware-compat
ENV SHOPWARE_COMPAT_BIND=0.0.0.0:8812
USER app
EXPOSE 8812
CMD ["/app/shopware-compat"]
