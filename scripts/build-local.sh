#!/usr/bin/env bash
# Local counterpart of .github/workflows/mobile-build.yml: builds on this
# machine with `eas build --local` (no EAS build credits) and submits the
# artifacts to TestFlight / Google Play.
#
# EAS is still the source of truth for signing credentials and build numbers
# (appVersionSource: remote + autoIncrement), so this stays interchangeable
# with the cloud workflow -- the counters never diverge.
#
# Like CI, it only builds semver release tags (vX.Y.Z), from a throwaway git
# worktree, so your working tree (dirty or not) is never touched.
#
# Usage: scripts/build-local.sh [ios|android|all] [options]
#   --profile <name>   EAS build profile (default: production)
#   --ref <vX.Y.Z>    semver release tag to build (default: latest)
#   --no-submit        build only; leave artifacts in .build-local/
#   --keep             keep the worktree afterwards (for debugging)
#   --interactive      let EAS prompt (Apple login, capability sync); needed
#                      after adding entitlements such as Associated Domains
set -euo pipefail

PLATFORM="all"
PROFILE="production"
REF=""
SUBMIT=1
KEEP=0
INTERACTIVE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    ios|android|all) PLATFORM="$1" ;;
    --profile) PROFILE="$2"; shift ;;
    --ref) REF="$2"; shift ;;
    --no-submit) SUBMIT=0 ;;
    --keep) KEEP=1 ;;
    --interactive) INTERACTIVE=1 ;;
    -h|--help) sed -n '2,22p' "$0"; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
  shift
done

REPO="$(git rev-parse --show-toplevel)"
OUT="$REPO/.build-local"
EAS=(npx --yes eas-cli)
mkdir -p "$OUT"

# Only production builds are store-bound; internal profiles have no submit profile.
[[ "$PROFILE" != "production" ]] && SUBMIT=0

want() { [[ "$PLATFORM" == "all" || "$PLATFORM" == "$1" ]]; }
die() { echo "error: $*" >&2; exit 1; }

# --- toolchain defaults (Homebrew: openjdk@17 + android-commandlinetools) ---
if [[ -z "${JAVA_HOME:-}" && -d /opt/homebrew/opt/openjdk@17 ]]; then
  export JAVA_HOME=/opt/homebrew/opt/openjdk@17
  export PATH="$JAVA_HOME/bin:$PATH"
fi
if [[ -z "${ANDROID_HOME:-}" && -d /opt/homebrew/share/android-commandlinetools ]]; then
  export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
fi

# --- preflight -------------------------------------------------------------
command -v pnpm >/dev/null || die "pnpm not found"
"${EAS[@]}" whoami >/dev/null 2>&1 || die "not logged in to EAS (run: npx eas-cli login, or set EXPO_TOKEN)"

if want ios; then
  command -v xcodebuild >/dev/null || die "Xcode command line tools missing"
  command -v pod >/dev/null || die "CocoaPods missing (brew install cocoapods)"
  command -v fastlane >/dev/null || die "fastlane missing (brew install fastlane) -- required by eas build --local"
fi
if want android; then
  command -v java >/dev/null || die "JDK missing (Android Studio bundles one; set JAVA_HOME)"
  [[ -n "${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}" ]] || die "ANDROID_HOME not set (usually ~/Library/Android/sdk)"
fi

# --- source tree -----------------------------------------------------------
WORKTREE=""
cleanup() {
  if [[ -n "$WORKTREE" && $KEEP -eq 0 ]]; then
    git -C "$REPO" worktree remove --force "$WORKTREE" 2>/dev/null || true
  fi
}
trap cleanup EXIT

# Every artifact must come from a semver release tag (vX.Y.Z), so any build
# in a store maps back to an exact commit and changelog entry.
git -C "$REPO" fetch --tags --quiet || echo "warning: could not fetch tags, using local ones"
if [[ -z "$REF" ]]; then
  REF="$(git -C "$REPO" tag --list 'v*' --sort=-v:refname | head -1)"
  [[ -n "$REF" ]] || die "no release tag found"
fi
[[ "$REF" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]] || die "--ref must be a semver tag like v1.7.0 (got '$REF')"
git -C "$REPO" rev-parse -q --verify "refs/tags/$REF" >/dev/null || die "tag $REF does not exist"
LABEL="$REF"

WORKTREE="$(mktemp -d "${TMPDIR:-/tmp}/halacha-build.XXXXXX")"
echo "==> Building $REF in $WORKTREE"
git -C "$REPO" worktree add --detach "$WORKTREE" "$REF" >/dev/null
VERSION="$(node -p "require('$WORKTREE/package.json').version")"
[[ "v$VERSION" == "$REF" ]] || die "package.json version ($VERSION) does not match tag $REF"
git -C "$WORKTREE" submodule update --init --recursive --quiet
(cd "$WORKTREE" && pnpm install --frozen-lockfile)
SRC="$WORKTREE"

# --- build + submit --------------------------------------------------------
FAILED=()
NI="--non-interactive"
[[ $INTERACTIVE -eq 1 ]] && NI=""

build_and_submit() {
  local platform="$1" ext="$2"
  local artifact="$OUT/halacha-baderech-${LABEL}-${platform}-$(date +%Y%m%d-%H%M%S).${ext}"

  echo "==> [$platform] building ($PROFILE)"
  if ! (cd "$SRC" && "${EAS[@]}" build --platform "$platform" --profile "$PROFILE" \
        --local $NI --output "$artifact"); then
    FAILED+=("$platform build"); return
  fi
  echo "==> [$platform] artifact: $artifact"

  if [[ $SUBMIT -eq 1 ]]; then
    echo "==> [$platform] submitting"
    (cd "$SRC" && "${EAS[@]}" submit --platform "$platform" --profile "$PROFILE" \
        --path "$artifact" $NI) || FAILED+=("$platform submit")
  fi
}

want ios && build_and_submit ios ipa
want android && build_and_submit android aab

if [[ ${#FAILED[@]} -gt 0 ]]; then
  echo "==> FAILED: ${FAILED[*]}" >&2
  exit 1
fi
echo "==> Done. Artifacts in $OUT"
