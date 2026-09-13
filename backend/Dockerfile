# syntax=docker/dockerfile:1

FROM ruby:4.0-slim AS base

WORKDIR /rails
ENV RAILS_ENV=production \
    BUNDLE_WITHOUT=development:test \
    BUNDLE_PATH=/usr/local/bundle \
    PORT=3000

RUN gem install bundler -v 4.0.3 --no-document \
    && apt-get update -qq \
    && apt-get install --no-install-recommends -y libpq5 libvips42 \
    && rm -rf /var/lib/apt/lists/*

FROM base AS build

RUN apt-get update -qq \
    && apt-get install --no-install-recommends -y build-essential libpq-dev libvips-dev pkg-config \
    && rm -rf /var/lib/apt/lists/*

COPY Gemfile Gemfile.lock ./
RUN bundle config set deployment true \
    && bundle install \
    && rm -rf /usr/local/bundle/cache /root/.bundle

COPY . .

FROM base AS app

COPY --from=build /usr/local/bundle /usr/local/bundle
COPY --from=build /rails /rails

RUN useradd --create-home --shell /bin/bash rails \
    && mkdir -p db storage tmp/pids \
    && chown -R rails:rails /rails

USER rails
EXPOSE 3000
CMD ["bundle", "exec", "puma", "-C", "config/puma.rb"]
