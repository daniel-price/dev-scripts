ignore_deps="aws-sdk,bun:sqlite,bun,bun:test,@types/bun,dependency-cruiser,depcheck,@aryzing/bun-mock-fetch"

had_error=false
for d in .{/packages/*,}/; do
    res=$(depcheck --ignores="$ignore_deps" "$d")
    if [ "$res" != "No depcheck issue" ]; then
        echo "$d: $res"
        had_error=true
    fi
done

if [ "$had_error" = true ]; then
    exit 1
fi

depcruise . -x "bun|test-setup"
