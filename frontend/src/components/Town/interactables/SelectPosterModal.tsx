import {
  Button,
  FormControl,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  useToast,
  UseToastOptions,
} from '@chakra-ui/react';
import React, { useCallback, useEffect, useState } from 'react';
import { usePosterSessionAreaController } from '../../../classes/TownController';
import PosterSessionArea from './PosterSessionArea';
import { PosterSessionArea as PosterSessionAreaModel } from '../../../types/CoveyTownSocket';
import useTownController from '../../../hooks/useTownController';

export default function SelectPosterModal({
  isOpen,
  close,
  posterSessionArea,
}: {
  isOpen: boolean;
  close: () => void;
  posterSessionArea: PosterSessionArea;
}): JSX.Element {
  const coveyTownController = useTownController();
  const posterSessionAreaController = usePosterSessionAreaController(posterSessionArea?.id);

  const [title, setTitle] = useState<string | undefined>(posterSessionArea?.defaultTitle || '');
  const [posterFileContents, setImageContents] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (isOpen) {
      coveyTownController.pause();
    } else {
      coveyTownController.unPause();
    }
  }, [coveyTownController, isOpen]);

  const closeModal = useCallback(() => {
    coveyTownController.unPause();
    close();
  }, [coveyTownController, close]);

  const toast = useToast();

  // Read a file as a base64-encoded string
  async function readFileAsBase64(file: File | null | undefined): Promise<string | undefined> {
    return new Promise((resolve, reject) => {
      if (file === null || file === undefined) {
        resolve(undefined);
      }
      const reader = new FileReader();
      reader.readAsDataURL(file as File);
      reader.onload = () => {
        resolve(reader.result as string);
      };
      reader.onerror = error => {
        reject(error);
      };
    });
  }

  // Create a poster given the title and image specified by the user in this selection.
  // If one of these components of the poster is missing, or if the posterAreaController was not
  // found, then don't create the poster.
  // Toast some errors if the poster could not be created.
  const createPoster = useCallback(async () => {
    let tempTitle = 'Failed to create poster!';
    let tempDescription = '';
    let tempStatus: UseToastOptions['status'] = 'success';
    if (posterSessionAreaController === undefined) {
      tempDescription += ' Undefined PosterSessionAreaController.';
      tempStatus = 'error';
    }
    if (title === undefined) {
      tempDescription += ' Undefined title.';
      tempStatus = 'error';
    }
    if (title === '') {
      tempDescription += ' Empty title.';
      tempStatus = 'error';
    }
    if (posterFileContents === undefined) {
      tempDescription += ' Undefined posterFileContents.';
      tempStatus = 'error';
    }
    if (posterFileContents === '') {
      tempDescription += ' Empty posterFileContents.';
      tempStatus = 'error';
    }
    if (tempStatus === 'success') {
      const poster: PosterSessionAreaModel = {
        id: posterSessionAreaController.id,
        title: title,
        stars: 0,
        imageContents: posterFileContents,
      };
      try {
        await coveyTownController.createPosterSessionArea(poster);
        tempTitle = 'Success!';
        tempDescription = 'Poster created.';
      } catch (error) {
        tempDescription += (error as Error).toString();
        tempStatus = 'error';
      }
    }
    toast({
      title: tempTitle,
      description: tempDescription,
      status: tempStatus,
      isClosable: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    title,
    posterFileContents,
    setTitle,
    coveyTownController,
    posterSessionAreaController,
    closeModal,
    toast,
  ]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        closeModal();
        coveyTownController.unPause();
      }}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Create a poster in {posterSessionAreaController?.id} </ModalHeader>
        <ModalCloseButton />
        <form
          onSubmit={ev => {
            ev.preventDefault();
            createPoster();
          }}>
          <ModalBody pb={6}>
            <FormControl>
              <FormLabel htmlFor='title'>Title of Poster</FormLabel>
              <Input
                id='title'
                placeholder='Share the title of your poster'
                name='title'
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </FormControl>
            <FormControl>
              <FormLabel htmlFor='posterFile'>
                Click here to choose PNG image file of Poster
              </FormLabel>
              <Input
                type='file'
                id='posterFile'
                placeholder='Click here to choose the PNG image file of your poster'
                name='posterFile'
                style={{ display: 'none' }}
                onChange={async e => {
                  const newFile = e.target.files?.item(0);
                  const newFileContents = await readFileAsBase64(newFile);
                  setImageContents(newFileContents ? newFileContents : undefined);
                }}
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme='blue' mr={3} onClick={createPoster}>
              Create
            </Button>
            <Button onClick={closeModal}>Cancel</Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
