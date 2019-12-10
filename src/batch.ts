import spexlib from "spex";
const spex: spexlib.ISpex = spexlib(Promise);

let ctl = "promises";

const resolveAfter = (timeoutInMs: number) =>
  new Promise(resolve =>
    setTimeout(() => {
      console.timeLog(ctl, "resolved");
      resolve("->resolved");
    }, timeoutInMs)
  );
const rejectAfter = (timeoutInMs: number) =>
  new Promise((resolve, reject) =>
    setTimeout(() => {
      console.timeLog(ctl, "rejected");
      reject("->rejected");
    }, timeoutInMs)
  );

function getPromises() {
  return [resolveAfter(1000), rejectAfter(1500), resolveAfter(3000)];
}

async function promiseAllTest() {
  const promises = getPromises();
  try {
    const batchResultArr = await Promise.all(promises);
    console.log(batchResultArr);
  } catch (e) {
      console.timeLog(ctl, "caught error", e);
  }
  console.timeLog(ctl, "Promise.all done");
}

async function batchTest() {
  const promises = getPromises();
  try {
      const batchResultArr = await spex.batch(promises, {
          cb: (index, success, result, delay) => {
              console.timeLog(ctl, index, success, result, delay);
          }
      });
      console.log(batchResultArr, batchResultArr.duration);
  } catch (e) {
      console.timeLog(ctl, "caught error", e);
  }
  console.timeLog(ctl, "Batch done");
}

async function test() {
  ctl = "promise.All";
  console.time(ctl);
  await promiseAllTest();
  // ctl = "batch";
  // console.time(ctl);
  // await batchTest();
}

/**
 * https://github.com/vitaly-t/pg-promise/wiki/FAQ#why-use-method-batch-instead-of-promiseall
 *
 * in the terminal, execute: ts-node --dir ./src batch.ts
 */
test();
