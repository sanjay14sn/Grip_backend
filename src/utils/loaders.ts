// import path from 'path';
// import fs from 'fs';
// // Controller and Middleware directories
// const baseControllerDir = path.join(__dirname, '../', 'controllers');
// const controllerDirs = ['', 'mobile', 'admin'];
// const middlewareDir = path.join(__dirname, '../', 'middleware');

// const loadControllersFromDir = async (dir: string): Promise<any[]> => {
//   const controllers: any[] = [];
//   try {
//     const files = fs.readdirSync(dir);
//     for (const file of files) {
//       if (file.endsWith('Controller.ts') || file.endsWith('.controller.ts') || file.endsWith('Controller.js') || file.endsWith('.controller.js')) {
//         const controllerPath = path.join(dir, file);
//         const module = await import(controllerPath);
//         const controller = module.default || module;
//         const controllerName = controller.name || 'AnonymousController';
//         console.log(`src/controllers/${path.basename(dir)}: [${controllerName}]`);
//         controllers.push(controller);
//       }
//     }
//   } catch (err) {
//     console.error(`Error loading controllers from ${dir}:`, err);
//   }
//   return controllers;
// };

// export const loadControllers = async (): Promise<any[]> => {
//   const controllers: any[] = [];

//   for (const dir of controllerDirs) {
//     const fullPath = path.join(baseControllerDir, dir);
//     if (fs.existsSync(fullPath)) {
//       const dirControllers = await loadControllersFromDir(fullPath);
//       controllers.push(...dirControllers);
//     } else {
//       console.warn(`Controller directory not found: ${fullPath}`);
//     }
//   }

//   return controllers;
// };

// export const loadMiddlewares = async (): Promise<any[]> => {
//   const middlewares: any[] = [];
//   try {
//     const files = fs.readdirSync(middlewareDir);
//     for (const file of files) {
//       if (file.endsWith('Middleware.ts') || file.endsWith('Middleware.js')) {
//         const middlewarePath = path.join(middlewareDir, file);
//         const module = await import(middlewarePath);
//         const middleware = module.default || module;
//         const middlewareName = middleware.name || 'AnonymousMiddleware';
//         console.log(`src/middleware: [${middlewareName}]`);
//         middlewares.push(middleware);
//       }
//     }
//   } catch (err) {
//     console.error('Error finding or loading middlewares:', err);
//   }
//   return middlewares;
// };


import path from "path";
import fs from "fs/promises";

// Directories
const baseControllerDir = path.join(__dirname, "../", "controllers");
const controllerDirs = ["", "mobile", "admin"];
const middlewareDir = path.join(__dirname, "../", "middleware");

// ✅ Utility: Load controllers from a directory
const loadControllersFromDir = async (dir: string): Promise<any[]> => {
  const controllers: any[] = [];
  try {
    const files = await fs.readdir(dir);
    const validFiles = files.filter(
      (file) =>
        file.endsWith("Controller.ts") ||
        file.endsWith(".controller.ts") ||
        file.endsWith("Controller.js") ||
        file.endsWith(".controller.js")
    );

    // Parallel import for speed
    const imports = await Promise.all(
      validFiles.map(async (file) => {
        const controllerPath = path.join(dir, file);
        const module = await import(controllerPath);
        return module.default || module;
      })
    );

    controllers.push(...imports);
  } catch (err) {
    // Optional: Comment this out too if you want total silence
    console.warn(`⚠️ Could not load controllers from ${dir}:`);
  }
  return controllers;
};

// ✅ Load all controllers
export const loadControllers = async (): Promise<any[]> => {
  const controllers: any[] = [];

  await Promise.all(
    controllerDirs.map(async (subDir) => {
      const fullPath = path.join(baseControllerDir, subDir);
      try {
        const dirControllers = await loadControllersFromDir(fullPath);
        controllers.push(...dirControllers);
      } catch {
        // silently skip missing folders
      }
    })
  );

  return controllers;
};

// ✅ Load all middlewares
export const loadMiddlewares = async (): Promise<any[]> => {
  const middlewares: any[] = [];
  try {
    const files = await fs.readdir(middlewareDir);
    const validFiles = files.filter(
      (file) => file.endsWith("Middleware.ts") || file.endsWith("Middleware.js")
    );

    const imports = await Promise.all(
      validFiles.map(async (file) => {
        const middlewarePath = path.join(middlewareDir, file);
        const module = await import(middlewarePath);
        return module.default || module;
      })
    );

    middlewares.push(...imports);
  } catch {
    // optional warning if middleware folder is missing
  }
  return middlewares;
};
