const path = require('path');
const fs = require('fs');

const expressJSDocSwagger = require('express-jsdoc-swagger');

// Get version
let version = "1.0.0"

// Swagger options
const options = {
    info: {
        version: version,
        title: 'Fanga',
        description: "Fanga Backend API",
        license: {
            name: 'MIT',
        },
    },
    security: {},
    // Base directory which we use to locate your JSDOC files
    baseDir: path.join(__dirname, "../backend/src"),
    // Glob pattern to find your jsdoc files (multiple patterns can be added in an array)
    filesPattern: '**/*.ts',
    // URL where SwaggerUI will be rendered
    swaggerUIPath: '/api-docs',
    // Expose OpenAPI UI
    exposeSwaggerUI: false,
    // Expose Open API JSON Docs documentation in `apiDocsPath` path.
    exposeApiDocs: false,
    // Open API JSON Docs endpoint.
    apiDocsPath: '/v3/api-docs',
    // Set non-required fields as nullable by default
    notRequiredAsNullable: false,
    // You can customize your UI options.
    // you can extend swagger-ui-express config. You can checkout an example of this
    // in the `example/configuration/swaggerOptions.js`
    swaggerUiOptions: {},
    // multiple option in case you want more that one instance
    multiple: true,
};


// Build spec file
const instance = expressJSDocSwagger(null)(options);

console.log("Building")

instance.on("finish", (data) => {
    // Save spec file
    console.log("Saving")

    const content = JSON.stringify(data);

    const template = fs.readFileSync('template.html', 'utf8');

    fs.writeFileSync("index.html", template.toString().replace("{%REPLACE%}", content));
    console.log("Done")
})
