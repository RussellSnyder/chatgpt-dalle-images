const getEmbedding = async (text, model = "text-embedding-ada-002") => {
  await delay(2000);
  return [0.5, 0.5, 0.5];
};

module.exports = getEmbedding;
