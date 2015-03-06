// Lazy
var Lazy = (function () {
    function Lazy(thunk) {
        this.thunk = thunk;
    }
    Lazy.prototype.force = function () {
        if (this.thunk) {
            this.val = this.thunk();
            delete this.thunk;
        }
        return this.val;
    };
    return Lazy;
})();
function defer(val) {
    return new Lazy(function () { return val; });
}
// Lazy functor
function l_fmap(f, l) {
    return new Lazy(function () { return f(l.force()); });
}
var LazyCons = (function () {
    function LazyCons(x, xs) {
        this.x = x;
        this.xs = xs;
        this.empty = false;
    }
    LazyCons.prototype.destruct = function (f) {
        return f(this.x, this.xs);
    };
    return LazyCons;
})();
var LazyNil = {
    empty: true,
    destruct: function (f) {
        throw new Error('Calling LazyNil.destruct');
    }
};
// LazyList functor
function ll_fmap(f, l) {
    if (l.empty)
        return LazyNil;
    return l.destruct(function (lx, lxs) {
        return new LazyCons(l_fmap(f, lx), l_fmap(function (xs) { return ll_fmap(f, xs); }, lxs));
    });
}
// LazyList utils
function repeat(x) {
    return new LazyCons(defer(x), new Lazy(function () { return repeat(x); }));
}
function take(n, l) {
    if (!n)
        return LazyNil;
    if (l.empty)
        return LazyNil;
    return l.destruct(function (x, xs) {
        return new LazyCons(x, new Lazy(function () { return take(n - 1, xs.force()); }));
    });
}
function skip(n, l) {
    if (l.empty)
        return LazyNil;
    if (!n)
        return l;
    return l.destruct(function (x, xs) { return skip(n - 1, xs.force()); });
}
function tail(l) {
    return skip(1, l);
}
function iterate(f, v) {
    return new LazyCons(defer(v), new Lazy(function () { return iterate(f, f(v)); }));
}
function toArray(l) {
    var res = [];
    while (!l.empty) {
        l.destruct(function (x, xs) {
            res.push(x.force());
            l = xs.force();
        });
    }
    return res;
}
// Zipper
var Zipper = (function () {
    function Zipper(l, val, r) {
        this.l = l;
        this.val = val;
        this.r = r;
    }
    return Zipper;
})();
// Zipper functor
function z_fmap(f, z) {
    return new Zipper(ll_fmap(f, z.l), l_fmap(f, z.val), ll_fmap(f, z.r));
}
// Zipper comonad
function cojoin(z) {
    return new Zipper(tail(iterate(left, z)), defer(z), tail(iterate(right, z)));
}
var coreturn = head;
function cobind(z, f) {
    return z_fmap(f, cojoin(z));
}
// Zipper utils
function left(z) {
    if (z.l.empty) {
        return z;
    }
    var nv;
    var nl;
    z.l.destruct(function (x, xs) {
        nv = x;
        nl = xs.force();
    });
    return new Zipper(nl, nv, new LazyCons(z.val, defer(z.r)));
}
function right(z) {
    if (z.r.empty) {
        return z;
    }
    var nv;
    var nr;
    z.r.destruct(function (x, xs) {
        nv = x;
        nr = xs.force();
    });
    return new Zipper(new LazyCons(z.val, defer(z.l)), nv, nr);
}
function head(z) {
    return z.val.force();
}
// Utils
function toNum(b0, b1, b2) {
    return (b0 ? 1 : 0) + (b1 ? 2 : 0) + (b2 ? 4 : 0);
}
function applyRule(rule) {
    return function (z) {
        var l = head(left(z));
        var c = head(z);
        var r = head(right(z));
        var n = toNum(r, c, l);
        return rule[n];
    };
}
function toBin(n) {
    var r = [];
    for (var i = 0; i < 8; i++) {
        r.push(((n & Math.pow(2, i)) >>> i) === 1);
    }
    return r;
}
function toStr(z) {
    return z_fmap(function (b) {
        return b ? '#' : ' ';
    }, z);
}
var pre = document.body.querySelector('pre');
function log(n, z) {
    var l = toArray(take(n, z.l)).reverse().join('');
    var c = head(z);
    var r = toArray(take(n, z.r)).join('');
    pre.appendChild(document.createTextNode(l + c + r + '\n'));
}
// main
var rule = applyRule(toBin(90));
var z0 = new Zipper(repeat(false), defer(true), repeat(false));
var zs = iterate(function (z) {
    return cobind(z, rule);
}, z0);
toArray(take(200, zs)).forEach(function (z) {
    log(100, toStr(z));
});
