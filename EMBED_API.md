# Embed API

Parent ↔ iframe integration for the configurator embed. Lets host sites (e.g. WooCommerce product pages) drive selections and receive state on order submission.

## Embed URL

```
https://glbconfigurator.com/embed/<configuratorId>
```

### URL parameters (initial state)

| Param | Description | Example |
|---|---|---|
| `variant` | Variant ID for the first/default group | `?variant=v_abc123` |
| `variants.<groupId>` | Variant ID per group | `?variants.g1=v_abc123&variants.g2=v_xyz789` |
| `color` | Selected color label | `?color=Natural` |
| `part.<groupLabel>` | Part-option label per group (URL-encode label) | `?part.Size=Large` |
| `interior` | Interior ID | `?interior=i_001` |
| `view` | Initial tab: `exterior` / `interior` / `order` | `?view=order` |
| `state` | Base64-encoded full selection JSON (overrides others) | `?state=eyJ2YXJpYW50cy4uLn0=` |
| `order` | Load saved state from a past order | `?order=<orderId>` |

`order` takes priority; `state` overrides flat params.

## postMessage events

The iframe communicates with its parent via `window.postMessage`. All event types are prefixed `glbc:`.

### Iframe → parent (outgoing)

#### `glbc:ready`
Fired once when the configurator mounts. Includes config metadata so the parent can build its UI.

```js
{
  type: 'glbc:ready',
  payload: {
    configId: 'abc123',
    name: 'B4 Container',
    groups: [
      { id: 'g1', label: 'Waste type', variants: [{ id: 'v1', label: 'Paper' }, { id: 'v2', label: 'Glass' }] }
    ],
    hasOrder: true,
    hasInteriors: false
  }
}
```

#### `glbc:selectionChanged`
Fired whenever the user OR the API changes a selection.

```js
{
  type: 'glbc:selectionChanged',
  payload: {
    selection: {
      variants: { g1: 'v1' },
      color: 'Natural',
      partOptions: { Size: 'Large' },
      interiorId: null,
      view: 'exterior',
      layers: { layer_1: true }
    }
  }
}
```

#### `glbc:orderSubmitted`
Fired after the user submits the order form. Includes the saved order ID, the rendered snapshot URL (front view of the configurator at submit time), and a permanent state URL that re-hydrates the configurator.

```js
{
  type: 'glbc:orderSubmitted',
  payload: {
    orderId: 'ord_xyz',
    snapshotUrl: 'https://firebasestorage.googleapis.com/.../snapshot.png',
    stateUrl: 'https://glbconfigurator.com/embed/abc123?order=ord_xyz',
    selection: { /* same shape as selectionChanged */ },
    selections: {
      model: { 'Waste type': 'Paper' },
      color: 'Natural',
      partOptions: { Size: 'Large' }
    },
    formData: { name: 'Bob', email: '...' }
  }
}
```

### Parent → iframe (incoming)

#### `glbc:setSelection`
Replaces the configurator selection. Any field omitted is left at its existing value, but provided fields fully replace (e.g. `variants` replaces the whole map, not merged).

```js
iframe.contentWindow.postMessage({
  type: 'glbc:setSelection',
  payload: {
    selection: {
      variants: { g1: 'v2' },
      color: 'Dark',
      partOptions: { Size: 'Small' },
      view: 'exterior'
    }
  }
}, 'https://glbconfigurator.com')
```

#### `glbc:patchSelection`
Same as `setSelection` but `variants`, `partOptions`, and `layers` are merged into the current state instead of replacing them.

```js
iframe.contentWindow.postMessage({
  type: 'glbc:patchSelection',
  payload: { selection: { color: 'Dark' } }
}, '*')
```

## WooCommerce / WordPress integration example

Embed the configurator below the product gallery, then wire the WooCommerce variation dropdowns to push selections into it.

```html
<iframe id="glbc-frame"
        src="https://glbconfigurator.com/embed/abc123"
        style="width:100%; height:600px; border:0;"></iframe>

<script>
(function () {
  const iframe = document.getElementById('glbc-frame')
  const ORIGIN = 'https://glbconfigurator.com'

  // Map WooCommerce variation attribute → configurator selection
  function pushSelection() {
    const wasteType = document.querySelector('select[name="attribute_pa_waste-type"]')?.value
    const size      = document.querySelector('select[name="attribute_pa_size"]')?.value
    if (!wasteType && !size) return

    // Translate human-readable Woo values into configurator IDs.
    // Build this mapping once you know your config's group/variant IDs (see glbc:ready event).
    const WASTE_MAP = { paper: 'v_paper', glass: 'v_glass', mixed: 'v_mixed' }
    const SIZE_MAP  = { small: 'Small', large: 'Large' }

    iframe.contentWindow.postMessage({
      type: 'glbc:patchSelection',
      payload: {
        selection: {
          variants:    wasteType ? { g1: WASTE_MAP[wasteType] } : undefined,
          partOptions: size      ? { Size: SIZE_MAP[size] }     : undefined,
        }
      }
    }, ORIGIN)
  }

  // 1. On configurator ready, push the initial Woo selection.
  // 2. On any subsequent variation change, push again.
  window.addEventListener('message', function (event) {
    if (event.origin !== ORIGIN) return
    const { type, payload } = event.data || {}
    if (type === 'glbc:ready') {
      pushSelection()
    }
    if (type === 'glbc:orderSubmitted') {
      // Attach snapshot + state URL to the WooCommerce order
      // (e.g. via hidden inputs, AJAX to admin-ajax.php, etc.)
      const form = document.querySelector('form.cart')
      if (!form) return
      const fields = {
        glbc_order_id:    payload.orderId,
        glbc_snapshot:    payload.snapshotUrl,
        glbc_state_url:   payload.stateUrl,
      }
      for (const [name, value] of Object.entries(fields)) {
        if (!value) continue
        let input = form.querySelector(`input[name="${name}"]`)
        if (!input) {
          input = document.createElement('input')
          input.type = 'hidden'
          input.name = name
          form.appendChild(input)
        }
        input.value = value
      }
    }
  })

  // Push selection whenever any variation dropdown changes.
  document.querySelectorAll('table.variations select').forEach((sel) => {
    sel.addEventListener('change', pushSelection)
  })
})()
</script>
```

## Selection schema

The canonical selection object used by all events:

```ts
type Selection = {
  variants?:    { [groupId: string]: string },        // group → variant ID
  color?:       string | null,                         // colorOption.label
  partOptions?: { [groupLabel: string]: string },     // partOption group label → option label
  interiorId?:  string | null,
  view?:        'exterior' | 'interior' | 'order',
  layers?:      { [layerId: string]: boolean },        // GLB layer visibility toggles
}
```

### Looking up valid IDs

- **Group IDs / variant IDs** — read from the `glbc:ready` event, or directly from the CMS Builder.
- **Color labels** — exact match against `variants[].colorOptions[].label`.
- **Part-option group labels** — exact match against `variants[].partOptions[].label`.
- **Part-option option labels** — exact match against `variants[].partOptions[].options[].label`.

Labels are user-defined in the CMS; pick stable labels in the Builder to keep your WP-side mapping stable.

## Future: order state link / snapshot

Once an order is submitted, the `glbc:orderSubmitted` event includes:

- `snapshotUrl` — a PNG of the configurator as the customer saw it (single front-view angle).
- `stateUrl` — a permanent link of the form `/embed/<configId>?order=<orderId>` that re-renders the exact selection. Suitable for admin / customer confirmation emails.

These can be attached to the WooCommerce order line items as metadata.
