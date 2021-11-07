# Vue 2 transformer plugin for Parcel 2

## Installation

Install this package by `npm install parcel-transformer-vue2 --save-dev`

Add a `.parcelrc` file to your project with the following content:

```json
{
  "extends": "@parcel/config-default",
  "transformers": {
    "*.vue": ["parcel-transformer-vue2"],
    "template:*.vue": ["parcel-transformer-vue2"],
    "script:*.vue": ["parcel-transformer-vue2"],
    "style:*.vue": ["parcel-transformer-vue2"],
    "custom:*.vue": ["parcel-transformer-vue2"]
  }
}
```

If you need an example project, please check: https://github.com/TheBojda/parcel-vue2/tree/main/example-npm