# LMS Frontend

### Setup instruction

1. Clone the repository
```
    git clone https://github.com/sahil07git/lms-frontend.git
```

2. Move into the directory

```
cd lms-frontend
```
3. Install the dependencies
```
npm i
```

4. run the server
```
npm run dev
```

### Setup instructions for tailwind
[Tail wind official instruction doc](https://v3.tailwindcss.com/docs/installation)

1. Install tailwind

```
npm install -D tailwindcss@3 postcss autoprefixer
```
2. Create tailwind config file

```
npx tailwindcss init
```

3. Add file extensions to tailwind config file in the contents property

```
"./src/**/*.{html,js,ts,jsx,tsx}", "./index.html"
```

4. Add the tailwind directives at the top of the index.css file
```
@tailwind base;
@tailwind components;
@tailwind utilities;
```

5. Add the the following details in the plugin property of tailwind config
```
[require("daisyui"), require("@tailwind/line-clamp")]
```

### Adding plugins and dependencies
```
npm install @reduxjs/toolkit react-redux react-router-dom react-icons react-chartjs-2 chart.js daisyui axios react-hot-toast @tailwindcss/line-clamp
```

### Configure auto import sort eslinet

1. Install simple import sore
```
    npm i -D eslint-plugin-simple-import-sort
```
2. Add rule in `.eslint.cjs`
```
    'simple-import-sort/imports': 'error'
```
3. add simple-import sort plugin in .eslint.cjs
```
    plugins: [..., 'simple-import-sort']
```
4.To enable auto import sort on file save in vscode

    -Open settings.json
    -Add the following config
```
    "editor.codeActionsOnSave": {
        "source.fixAll.eslint": true
    }
```