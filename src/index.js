import {cx, isEmptyObject, falsyToString, joinObjects, removeExtraSpaces} from "./utils.js";

export const tv = (
  options,
  config = {
    twMerge: true,
    twMergeConfig: {},
  },
) => {
  const {
    slots: slotProps = {},
    variants = {},
    compoundVariants = [],
    defaultVariants = {},
  } = options;

  const component = (props) => {
    if (isEmptyObject(variants) && isEmptyObject(slotProps)) {
      return cx(options?.extend?.base, options?.base, props?.class, props?.className)(config);
    }

    if (compoundVariants && !Array.isArray(compoundVariants)) {
      throw new TypeError(
        `The "compoundVariants" prop must be an array. Received: ${typeof compoundVariants}`,
      );
    }

    // add "base" to the slots object
    const slots = {
      base: options?.base,
      ...slotProps,
    };

    const getScreenVariantValues = (screen, screenVariantValue, acc = [], slotKey) => {
      let result = acc;

      if (typeof screenVariantValue === "string") {
        result.push(
          removeExtraSpaces(screenVariantValue)
            .split(" ")
            .map((v) => `${screen}:${v}`),
        );
      } else if (Array.isArray(screenVariantValue)) {
        result.push(screenVariantValue.flatMap((v) => `${screen}:${v}`));
      } else if (typeof screenVariantValue === "object" && typeof slotKey === "string") {
        const value = screenVariantValue?.[slotKey];

        if (value && typeof value === "string") {
          const fixedValue = removeExtraSpaces(value);

          result[slotKey] = result[slotKey]
            ? [...result[slotKey], ...fixedValue.split(" ").map((v) => `${screen}:${v}`)]
            : fixedValue.split(" ").map((v) => `${screen}:${v}`);
        } else if (Array.isArray(value) && value.length > 0) {
          result[slotKey] = value.flatMap((v) => `${screen}:${v}`);
        }
      }

      return result;
    };

    const getVariantValue = (variant, vrs = variants, slotKey = null) => {
      const variantObj = vrs?.[variant];

      if (typeof variantObj !== "object" || isEmptyObject(variantObj)) {
        return null;
      }

      const variantProp = props?.[variant];
      let defaultVariantProp = defaultVariants?.[variant];
      let screenValues = [];

      if (variantProp === null) return null;

      const variantKey = falsyToString(variantProp);

      // responsive variants
      if (typeof variantKey === "object") {
        screenValues = Object.keys(variantKey).reduce((acc, screen) => {
          const screenVariantKey = variantKey[screen];
          const screenVariantValue = variantObj?.[screenVariantKey];

          if (screen === "initial") {
            defaultVariantProp = screenVariantKey;

            return acc;
          }

          return getScreenVariantValues(screen, screenVariantValue, acc, slotKey);
        }, []);
      }

      const value = variantObj[variantKey] || variantObj[falsyToString(defaultVariantProp)];

      if (
        typeof screenValues === "object" &&
        typeof slotKey === "string" &&
        screenValues[slotKey]
      ) {
        return joinObjects(screenValues, value);
      }

      return screenValues.length > 0 ? [value, ...screenValues] : value;
    };

    const getVariantClassNames = () => {
      const variantValues = variants
        ? Object.keys(variants).map((vk) => getVariantValue(vk, variants))
        : null;
      const extendedVariantValues = options?.extend?.variants
        ? Object.keys(options.extend.variants).map((vk) =>
            getVariantValue(vk, options.extend.variants),
          )
        : null;

      return [variantValues, extendedVariantValues].flat().filter(Boolean);
    };

    const getVariantClassNamesBySlotKey = (slotKey) => {
      if (!variants || typeof variants !== "object") {
        return null;
      }

      return Object.keys(variants)
        .map((variant) => {
          const variantValue = getVariantValue(variant, variants, slotKey);

          return slotKey === "base" && typeof variantValue === "string"
            ? variantValue
            : variantValue && variantValue[slotKey];
        })
        .filter(Boolean);
    };

    const propsWithoutUndefined =
      props && Object.fromEntries(Object.entries(props).filter(([, value]) => value !== undefined));

    const getCompoundVariantClassNames = compoundVariants
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ?.filter(({class: tvClass, className: tvClassName, ...compoundVariantOptions}) =>
        Object.entries(compoundVariantOptions).every(([key, value]) => {
          const initialProp = typeof props?.[key] === "object" ? props[key]?.initial : {};
          const compoundProps = {...defaultVariants, ...initialProp, ...propsWithoutUndefined};

          return Array.isArray(value)
            ? value.includes(compoundProps[key])
            : compoundProps[key] === value;
        }),
      )
      .flatMap(({class: tvClass, className: tvClassName}) => [tvClass, tvClassName]);

    const getCompoundVariantClassNamesBySlot = () => {
      const compoundClassNames = getCompoundVariantClassNames;

      if (!Array.isArray(compoundClassNames)) {
        return compoundClassNames;
      }

      return compoundClassNames.reduce((acc, className) => {
        if (typeof className === "string") {
          acc.base = cx(acc.base, className)(config);
        }

        if (typeof className === "object") {
          Object.entries(className).forEach(([slot, className]) => {
            acc[slot] = cx(acc[slot], className)(config);
          });
        }

        return acc;
      }, {});
    };

    // slots variants
    if (!isEmptyObject(slotProps)) {
      const compoundClassNames = getCompoundVariantClassNamesBySlot() ?? [];

      const slotsFns =
        typeof slots === "object" && !isEmptyObject(slots)
          ? Object.keys(slots).reduce((acc, slotKey) => {
              acc[slotKey] = (slotProps) =>
                cx(
                  slots[slotKey],
                  getVariantClassNamesBySlotKey(slotKey),
                  compoundClassNames?.[slotKey],
                  slotProps?.class,
                  slotProps?.className,
                )(config);

              return acc;
            }, {})
          : {};

      return {
        ...slotsFns,
      };
    }

    // normal variants
    return cx(
      options?.base,
      getVariantClassNames(),
      getCompoundVariantClassNames,
      props?.class,
      props?.className,
    )(config);
  };

  const getVariantKeys = () => {
    if (!variants || typeof variants !== "object") return;

    return Object.keys(variants);
  };

  component.variantkeys = getVariantKeys();
  component.base = options?.base;
  component.variants = variants;

  return component;
};

const p = tv({
  base: "text-base text-green-500",
  variants: {
    isBig: {
      true: "text-5xl",
      false: "text-2xl",
    },
    color: {
      red: "text-red-500 bg-red-500",
      blue: "text-blue-500 bg-blue-500",
    },
  },
});

const h1 = tv({
  extend: p,
  base: "text-3xl font-bold",
  variants: {
    color: {
      purple: "text-purple-500 bg-purple-500",
      green: "text-green-500 bg-green-500",
    },
  },
});

const result = h1({
  isBig: true,
  color: {
    // @ts-ignore TODO: fix this
    xs: "blue",
    // @ts-ignore TODO: fix this
    sm: "red",
    md: "purple",
    lg: "green",
  },
});

console.log(result);
