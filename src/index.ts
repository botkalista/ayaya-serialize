namespace Serialization {

    export class Serializable {
        static serializeSymbol = Symbol('props_to_serialize');
        static updateSymbol = Symbol('props_updated');

        serialize() {
            const props = {};
            const propsToSerialize = this[Serializable.serializeSymbol];
            if (!propsToSerialize) return;
            for (const key of propsToSerialize) {
                const target = this[key];
                if (Array.isArray(target)) {
                    props[key] = this[key].map(e => e.serialize ? e.serialize() : e);
                } else if (target.serialize) {
                    const serialization = target.serialize();
                    props[key] = serialization;
                } else {
                    props[key] = target;
                }
            }
            return props;
        }

        getUpdates() {
            const updates = {};

            const propsToSerialize = this[Serializable.serializeSymbol];
            for (const key of propsToSerialize) {
                const target = this[key];
                if (target && target.getUpdates) {
                    const v = target.getUpdates();
                    if (v && Object.keys(v).length > 0) {
                        this[Serializable.updateSymbol].push({ key, value: v });
                    }
                }
            }

            if (this[Serializable.updateSymbol]) {
                for (const update of this[Serializable.updateSymbol]) {
                    if (update.value) updates[update.key] = update.value;
                }
            }

            return updates;
        }

        clearUpdates() {
            this[Serializable.updateSymbol].length = 0;
            const propsToSerialize = this[Serializable.serializeSymbol];
            for (const key of propsToSerialize) {
                const target = this[key];
                if (target.getUpdates) {
                    target[Serializable.updateSymbol].length = 0;
                }
            }

        }
    }

    export function Serialize() {
        return function (target: Object, propertyKey: string) {
            target[Serializable.serializeSymbol] = target[Serializable.serializeSymbol] || [];
            target[Serializable.serializeSymbol].push(propertyKey);

            let value;

            Object.defineProperty(target, propertyKey, {
                get() {
                    return value;
                },
                set(val: any) {
                    target[Serializable.updateSymbol] = target[Serializable.updateSymbol] || [];
                    target[Serializable.updateSymbol].push({
                        key: propertyKey,
                        value: val
                    });
                    value = val;
                },
                enumerable: true,
                configurable: true
            });

        }
    }

}
namespace Client {

    export class Composite {

        onUpdate(key, value) {
            console.log('Updating ' + key, value);
        }


        private joinPath(p1, p2) {
            if (p1 == '') return p2;
            return p1 + '.' + p2;
        }

        update(updates, info = { path: undefined, parent: undefined }) {
            info.parent = info.parent || this;
            info.path = info.path || '';
            for (const key in updates) {
                if (typeof updates[key] === 'object') {
                    info.parent[key] = info.parent[key] || {};
                    this.update(updates[key], { path: this.joinPath(info.path, key), parent: info.parent[key] });
                } else {
                    info.parent[key] = updates[key];
                    this.onUpdate(this.joinPath(info.path, key), info.parent[key]);
                }
            }

        }

    }

}

//* --------------- TESTS --------------------------------------


function tests() {
    class Weapon extends Serialization.Serializable {
        @Serialization.Serialize()
        atk: number;
        @Serialization.Serialize()
        test: number;
        constructor() {
            super();
            this.atk = 10;
            this.test = 100;
        }
    }

    class Player extends Serialization.Serializable {
        @Serialization.Serialize()
        name: string = 'NoName';
        @Serialization.Serialize()
        def: number = 10;
        @Serialization.Serialize()
        weapon: Weapon = new Weapon();
        constructor() {
            super();
        }
    }


    const p = new Player();

    console.log(p.serialize());


    class ClientPlayer extends Client.Composite {
        constructor() {
            super();
        }
    }

    const c = new ClientPlayer();
    c.update(p.getUpdates());
    p.clearUpdates();
    console.log('------')

    p.weapon.test = 1;

    const updatesAfter = p.getUpdates();

    c.update(updatesAfter);
    console.log(c);
}

export {
    Serialization,
    Client
}