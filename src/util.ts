


export async function sleep(timeoutInMs: number) {
    console.log(`sleeping for ${timeoutInMs}ms`);
    await new Promise(resolve => setTimeout(resolve, timeoutInMs));
    return timeoutInMs;
}